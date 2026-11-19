# Inventory Bulk Import Tool

A web application for bulk importing inventory items from CSV files into a warehouse management system. Built for operations admins who are moving off spreadsheets.

## Features

### Smart Import Process
- **Drag-and-drop CSV upload** with instant parsing
- **Automatic fixes** for common data issues:
  - SKU formatting (uppercase, trim)
  - Category normalization
  - Boolean parsing (yes/no, true/false, 1/0)
  - Tag parsing from pipe-separated values
  - Whitespace trimming
  - Default values for optional fields

### Validation & Trust
- **Real-time validation** against schema rules
- **Clear error messages** for each invalid field
- **Duplicate SKU detection** (within file and database)
- **Show exactly what was auto-fixed** with green checkmarks

### Effortless UX
- **Filter views:** All / Valid Only / Needs Fixing
- **Visual status indicators** for each row
- **Preview before import** - see exactly what will happen
- **Post-import summary** with imported SKUs
- **No round-trips to spreadsheet** - everything in-app

## Prerequisites

- Node.js v18 or higher
- npm

## Running the Application

### Quick Start (from project root):

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## How to Use

1. **Drop or select a CSV file**
   - Supported format: CSV with headers
   - See `project-files/items_clean.csv` for example

2. **Review auto-fixes and validation**
   - Green indicators show what was automatically fixed
   - Red indicators show errors that need attention
   - Use filters to focus on what matters

3. **Import**
   - Only valid items will be imported
   - See exactly which SKUs were added
   - Database prevents duplicates

## Project Structure

```
sutton-project/
├── backend/
│   ├── server.js         # API endpoints (validate, import)
│   ├── db.js             # SQLite schema & connection
│   ├── inventory.db      # Database (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main import UI
│   │   └── App.css       # Styling
│   └── package.json
└── project-files/
    ├── items_clean.csv   # 25 well-formed items
    ├── items_messy.csv   # 200 items with issues
    └── schema.json       # JSON schema reference
```

## Item Schema

Required fields:
- **sku** - Format: `XXXX-XXX` (e.g., `PACK-7Q2`)
- **name** - 1-120 characters
- **category** - One of: raw_material, component, finished_good, packaging, consumable
- **uom** - One of: EA, BX, KG, M, L
- **unit_cost** - Decimal ≥ 0 (up to 4 decimal places)

Optional fields:
- quantity_on_hand, reorder_point, description, tags, is_active, lot_tracked,
  first_received_on, discontinued_on, dimensions, vendors

See `project-files/schema.json` for complete schema.

## API Endpoints

- `POST /api/validate` - Validate items before import
- `POST /api/import` - Import valid items to database
- `GET /api/items` - Retrieve all inventory items
- `GET /api/history` - View import history

## Tech Stack

- **Frontend:** React + Vite + PapaCSV (CSV parsing)
- **Backend:** Node.js + Express
- **Database:** SQLite + better-sqlite3
- **Validation:** Custom validators matching schema requirements

## Development

The app uses hot reload on both frontend and backend for rapid development:
- Frontend: Vite HMR (instant updates)
- Backend: nodemon (auto-restart on changes)

## Testing Files

Use the provided sample files to test:

**Clean data (should import 100%):**
```bash
project-files/items_clean.csv
```

**Messy data (will show auto-fixes):**
```bash
project-files/items_messy.csv
```

## Design Philosophy

This tool prioritizes **effortless user experience**:
1. **Automatic** - Fix what can be safely fixed
2. **Transparent** - Show exactly what changed
3. **Clear** - Make errors obvious and actionable
4. **Fast** - No round-trips, instant feedback
5. **Trustworthy** - Preview before commit, confirm after

Built for warehouse operations admins who need to trust their data.
