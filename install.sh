#!/bin/bash

# Job Application Tracker - Setup Script
# This script guides you through setting up the extension

set -e

echo "================================================"
echo "  Job Application Tracker - Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1/5: Installing dependencies...${NC}"
npm install

echo ""
echo -e "${GREEN}Step 2/5: Building extension...${NC}"
npm run build

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Manual Setup Required${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

echo -e "${BLUE}Step 3/5: Notion Setup${NC}"
echo "1. Go to: https://www.notion.so/my-integrations"
echo "2. Click 'New integration' and create one"
echo "3. Copy the API token"
echo "4. Create a database with these properties:"
echo "   - Company (Title)"
echo "   - Role (Text)"
echo "   - Status (Select: Applied, Interview, Rejected, Offer)"
echo "   - Date Applied (Date)"
echo "   - Location (Text)"
echo "   - Source (Text)"
echo "5. Share the database with your integration"
echo "6. Copy the Database ID from the URL"
echo ""
read -p "Press Enter when Notion setup is complete..."

echo ""
echo -e "${BLUE}Step 4/5: Gmail & Apple Mail Setup${NC}"
echo "1. Add your Gmail account to Apple Mail (if not already)"
echo "2. In Gmail web, create a label called 'Rejected'"
echo "3. Create a Gmail filter:"
echo "   - Go to Settings > Filters and Blocked Addresses > Create filter"
echo "   - Has the words: \"unfortunately\" OR \"not moving forward\" OR \"decided not to\" OR \"pursue other candidate\""
echo "   - Apply label: Rejected"
echo ""
read -p "Press Enter when Gmail setup is complete..."

echo ""
echo -e "${BLUE}Step 5/5: Apple Shortcut Setup${NC}"
echo ""
echo "Create a shortcut named 'Check Job Emails' with these actions:"
echo ""
echo "Action 1: Run AppleScript (copy from shortcuts/check-job-emails.applescript)"
echo "Action 2: Copy to Clipboard"
echo ""

read -p "Press Enter to open Shortcuts app..."
open -a "Shortcuts"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Setup Almost Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Final steps:"
echo "1. Create the Apple Shortcut (see shortcuts/ folder for the AppleScript)"
echo "2. Open Raycast"
echo "3. Search for 'Log Job Application'"
echo "4. Press Cmd+, to configure with your Notion token and Database ID"
echo ""
echo "Commands available:"
echo "  - Log Job Application: Save job postings to Notion"
echo "  - View Applications: Open your Notion database"
echo "  - Sync Application Status from Email: Sync rejections from Gmail"
echo ""
echo -e "${YELLOW}To start the extension in dev mode: npm run dev${NC}"
