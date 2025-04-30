from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import razorpay
from pymongo import MongoClient
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Validate required environment variables
required_env = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'MONGODB_URI']
missing_env = [env for env in required_env if not os.getenv(env)]
if missing_env:
    error_msg = f"Missing required environment variables: {', '.join(missing_env)}"
    logger.error(error_msg)
    raise EnvironmentError(error_msg)

# Razorpay setup
try:
    client = razorpay.Client(auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET')))
    # Validate credentials
    client.payment.all()
    logger.info("Razorpay client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Razorpay client: {str(e)}")
    raise

# MongoDB setup
try:
    mongo_client = MongoClient(os.getenv('MONGODB_URI'))
    # Test connection
    mongo_client.server_info()
    db = mongo_client['gt_bike_fundraiser']
    donations_collection = db['donations']
    logger.info("MongoDB connection established successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Goal amount for the bike
BIKE_GOAL = int(os.getenv('BIKE_GOAL', 450000))  # Default: ₹50,000

@app.route('/create-order', methods=['POST'])
def create_order():
    try:
        data = request.json
        
        if not data or 'amount' not in data:
            return jsonify({'error': 'Missing amount parameter'}), 400
            
        amount = int(data['amount'])
        
        if amount < 1:
            return jsonify({'error': 'Amount must be at least ₹10'}), 400
            
        amount_in_paise = amount * 100  # Convert to paise
        
        order_data = {
            'amount': amount_in_paise,
            'currency': 'INR',
            'receipt': f'donation_{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'payment_capture': 1  # Auto-capture
        }
        
        logger.info(f"Creating Razorpay order for amount: ₹{amount}")
        order = client.order.create(data=order_data)
        logger.info(f"Order created successfully: {order['id']}")
        
        return jsonify(order)
    except ValueError as e:
        logger.error(f"Value error in create_order: {str(e)}")
        return jsonify({'error': 'Invalid amount format'}), 400
    except Exception as e:
        logger.error(f"Error in create_order: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/save-donation', methods=['POST'])
def save_donation():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['amount', 'razorpay_payment_id', 'razorpay_order_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Verify payment with Razorpay
        try:
            payment = client.payment.fetch(data['razorpay_payment_id'])
            if payment['status'] != 'captured':
                logger.warning(f"Payment not captured: {payment['id']}, status: {payment['status']}")
                return jsonify({'error': 'Payment not captured or authorized'}), 400
        except Exception as e:
            logger.error(f"Failed to verify payment with Razorpay: {str(e)}")
            return jsonify({'error': 'Failed to verify payment'}), 500
        
        donation_record = {
            'name': data.get('name', 'Anonymous'),
            'email': data.get('email', ''),
            'amount': int(data['amount']),
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_order_id': data['razorpay_order_id'],
            'timestamp': datetime.now()
        }
        
        result = donations_collection.insert_one(donation_record)
        logger.info(f"Donation saved with ID: {result.inserted_id}")
        
        return jsonify({'success': True, 'message': 'Donation recorded successfully'})
    except ValueError as e:
        logger.error(f"Value error in save_donation: {str(e)}")
        return jsonify({'error': 'Invalid data format'}), 400
    except Exception as e:
        logger.error(f"Error in save_donation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-donations', methods=['GET'])
def get_donations():
    try:
        # Get all donations sorted by amount (descending)
        all_donations = list(donations_collection.find({}, 
                                                    {'_id': 0, 'name': 1, 'amount': 1, 'timestamp': 1})
                           .sort('amount', -1))
        
        # Format timestamp for JSON serialization
        for donation in all_donations:
            if 'timestamp' in donation:
                donation['timestamp'] = donation['timestamp'].isoformat()
        
        # Get last 5 donations
        last_five = list(donations_collection.find({}, 
                                                {'_id': 0, 'name': 1, 'amount': 1, 'timestamp': 1})
                       .sort('timestamp', -1)
                       .limit(5))
        
        # Format timestamp for JSON serialization
        for donation in last_five:
            if 'timestamp' in donation:
                donation['timestamp'] = donation['timestamp'].isoformat()
        
        # Calculate total raised
        pipeline = [{'$group': {'_id': None, 'total': {'$sum': '$amount'}}}]
        result = list(donations_collection.aggregate(pipeline))
        total_raised = result[0]['total'] if result else 0
        
        response_data = {
            'total_raised': total_raised,
            'goal': BIKE_GOAL,
            'percentage': round((total_raised / BIKE_GOAL) * 100, 2) if BIKE_GOAL > 0 else 0,
            'top_donors': all_donations[:5],  # Top 5 by amount
            'recent_donations': last_five,
            'donation_count': donations_collection.count_documents({})
        }
        
        logger.info(f"Donation stats retrieved: {total_raised} raised of {BIKE_GOAL} goal")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error in get_donations: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify the API is running"""
    try:
        # Check MongoDB connection
        mongo_client.server_info()
        # Check Razorpay connection
        client.payment.all(count=1)
        
        return jsonify({
            'status': 'healthy',
            'mongodb': 'connected',
            'razorpay': 'connected'
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting server on port {port}, debug mode: {debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)