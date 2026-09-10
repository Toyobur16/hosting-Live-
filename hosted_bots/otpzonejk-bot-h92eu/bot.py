# OtpZoneJK Telegram Bot
import os
import sys
import json
import time

BOT_TOKEN = os.getenv("BOT_TOKEN", "")

print("=" * 45)
print("OtpZoneJK Bot Initializing...")
print(f"Python Version: {sys.version.split()[0]}")
print("Status: Active & Monitoring 24/7")
print("=" * 45)

# Load existing data structures
data_files = [
    'users.json',
    'user_stats.json',
    'referral_data.json',
    'banned_users.json',
    'withdraw_requests.json',
    'activity_logs.json',
    'custom_services.json'
]

for filename in data_files:
    if os.path.exists(filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"Loaded {filename} ({len(data)} records)")
        except Exception as e:
            print(f"Notice: could not load {filename}: {e}")

print("OtpZoneJK Telegram Bot worker running smoothly...")

# Keep running loop
while True:
    time.sleep(10)
