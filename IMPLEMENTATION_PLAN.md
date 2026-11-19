# Implementation Plan - Inventory Bulk Import Tool

## Assessment Requirements Recap

**Time:** 60-minute timed assessment
**Goal:** Build a tool for warehouse admin to bulk import inventory items from CSV
**Core Philosophy:** Make it EFFORTLESS - admin should fix messy data IN the app, no trips back to spreadsheet

**Deliverables:**
- Runs locally with clear README
- Git commits showing work progression
- Submit as .zip file

## Technical Approach

### Architecture Decision
✅ **Frontend-first CSV parsing**
- Use PapaCSV in browser to parse CSV client-side
- Send JSON to backend for validation/import
- **Why:** Faster feedback, simpler architecture, no file upload complexity

### Tech Stack
- **Frontend:** React + Vite + PapaCSV
- **Backend:** Node.js + Express + better-sqlite3
- **Database:** SQLite (simple, embedded, perfect for assessment)
- **Design:** Apple-inspired aesthetics (SF Blue #007AFF, SF Pro fonts)

## Implementation Plan

### Phase 1: Foundation ✅
1. **Database Schema**
   - `inventory_items` table with all schema fields
   - `import_history` table for audit trail
   - JSON storage for tags, dimensions, vendors

2. **Backend API**
   - POST `/api/validate` - Validates items, checks duplicates
   - POST `/api/import` - Bulk insert valid items
   - GET `/api/items` - Retrieve all items
   - GET `/api/history` - Import history

3. **Validation Rules**
   - SKU pattern: `^[A-Z]{4}-[A-Z0-9]{3}$`
   - Required fields: sku, name, category, uom, unit_cost
   - Category enum: raw_material, component, finished_good, packaging, consumable
   - UOM enum: EA, BX, KG, M, L
   - Cross-field: discontinued_on requires is_active=false
   - Cross-field: at most one preferred vendor
   - Duplicate SKU detection (in file and database)

### Phase 2: Core Upload Flow ✅
1. **File Upload UI**
   - Drag-and-drop zone
   - Browse file button
   - Accept .csv files only

2. **CSV Parsing**
   - Parse with PapaCSV (handles quoted fields, multi-line)
   - Transform flattened CSV format:
     - `length, width, height, dimension_unit` → `dimensions` object
     - `vendor_1_name, vendor_1_sku...` up to vendor_3 → `vendors` array

3. **Validation Display**
   - Summary cards: Total / Valid / Invalid
   - Preview table with all rows
   - Status indicators (✓ Valid / ✗ Invalid)

### Phase 3: Smart Auto-Fix ✅
**Goal:** Fix what can be safely fixed automatically

Auto-fix features:
- SKU: uppercase and trim
- Name: trim whitespace
- Category: normalize to snake_case (lowercase, spaces → underscores)
- UOM: uppercase
- Booleans: parse yes/no/true/false/1/0 → true/false
- Tags: parse pipe-separated string → array
- Defaults: quantity_on_hand=0, is_active=true, lot_tracked=false

**Transparency:** Show EXACTLY what was auto-fixed with green checkmarks

### Phase 4: UX Polish ✅
1. **Filter Tabs**
   - All Rows
   - Valid Only
   - Needs Fixing

2. **Clear Error Messages**
   - Show all errors per row
   - Specific, actionable messages

3. **Preview Before Import**
   - See exactly what will be imported
   - Cancel or proceed

4. **Post-Import Summary**
   - Show successful imports
   - Display imported SKUs
   - Option to import another file

## Critical Discovery & Fix ✅

**Issue Found:** CSV files use FLATTENED format, but schema expects NESTED format

**Solution:** Transform flat CSV columns to nested structures before validation
- Dimensions: flat columns → nested object
- Vendors: vendor_1_*, vendor_2_*, vendor_3_* → array

## Testing Strategy

### Test Files
1. **items_clean.csv** - 25 well-formed items (should be 100% valid)
2. **items_messy.csv** - 200 items with common issues (test auto-fix)
3. **items_test_mix.csv** - 15 mixed items testing all scenarios

### Expected Behaviors
- Clean data imports immediately
- Messy data gets auto-fixed
- Invalid data shows clear errors
- No valid data is rejected
- All invalid data is caught

## Design Philosophy

**Effortless UX Principles:**
1. **Automatic** - Fix what can be safely fixed
2. **Transparent** - Show exactly what changed
3. **Clear** - Make errors obvious and actionable
4. **Fast** - No round-trips, instant feedback
5. **Trustworthy** - Preview before commit, confirm after

## Git Commit Strategy

Progressive commits showing work:
1. Initial project setup
2. Backend validation and import API
3. Basic CSV import with validation
4. Smart auto-fix and filtering features
5. Comprehensive validation and CSV transformation
6. Test files and documentation

## Success Criteria

✅ Runs locally with simple commands
✅ Handles messy CSV data gracefully
✅ Clear error messages for invalid data
✅ Shows what was auto-fixed
✅ Preview before import
✅ Post-import confirmation
✅ Git history shows progression
✅ README has clear instructions
✅ Ready for .zip submission

---

**Implementation Status:** ✅ COMPLETE

All features implemented and tested. Ready for final assessment submission.
