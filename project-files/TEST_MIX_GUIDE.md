# Test Mix File Guide

This file explains what `items_test_mix.csv` tests:

## Expected Results

### ✅ VALID (after auto-fix): 7 rows
1. **PERF-001** - Perfect Item
   - Clean data, should import immediately

2. **messy-sku** → **MESSY-SKU** (auto-fixed)
   - ✓ SKU: "messy-sku" → "MESSY-SKU" (uppercase)
   - ✓ Name: "  Needs Auto-Fix  " → "Needs Auto-Fix" (trim)
   - ✓ Category: "Raw Material" → "raw_material" (normalize)
   - ✓ UOM: "ea" → "EA" (uppercase)
   - ✓ Booleans: "yes"/"no" → true/false
   - ✓ Tags: "food-safe|bulk" → ["food-safe", "bulk"]

3. **DIMS-123** - Item with Dimensions
   - Tests CSV transformation: length, width, height → dimensions object
   - Dimension unit in inches

4. **VEND-M3X** - Multiple Vendors
   - Tests CSV transformation: vendor_1_*, vendor_2_*, vendor_3_* → vendors array
   - One preferred vendor (valid)
   - Has dimensions too

5. **DISC-OK1** - Discontinued Correct
   - discontinued_on set with is_active=false (valid rule)

6. **TAGS-TST** - Tag Parsing Test
   - ✓ Tags: "domestic|food-safe|seasonal|bulk" → ["domestic", "food-safe", "seasonal", "bulk"]
   - ✓ Booleans: "yes"/"no" → true/false

### ❌ INVALID: 8 rows

7. **DUPE-123** (first occurrence)
   - Error: "Duplicate SKU in file"

8. **DUPE-123** (second occurrence)
   - Error: "Duplicate SKU in file"

9. **BADSKU**
   - Error: "SKU must match format XXXX-XXX"
   - Only 6 characters, needs 4-3 pattern with hyphen

10. **(blank SKU)**
   - Error: "SKU is required"

11. **MISS-REQ**
   - Error: "Name is required"
   - Description field is empty (not the name)

12. **NOCT-001**
   - Error: "Category is required"

13. **NOUOM-99**
   - Error: "UOM is required"

14. **BAD-PREF**
   - Error: "At most one vendor can be marked as preferred"
   - Two vendors both marked as preferred

15. **DISC-BAD**
   - Error: "If discontinued_on is set, is_active must be false"
   - Cross-field validation rule violation

## Summary Stats

- **Total Rows:** 15
- **Expected Valid:** 7 (after auto-fixes)
- **Expected Invalid:** 8
- **Auto-fixes Applied:** ~15-20 individual fixes across multiple rows

## Test Instructions

1. Upload `items_test_mix.csv` to the dashboard
2. Review the summary cards:
   - Total: 15
   - Ready to Import: 7
   - Need Fixing: 8
3. Use filter tabs to view:
   - All Rows
   - Valid Only (7 rows)
   - Needs Fixing (8 rows)
4. Check the "Auto-Fixed" column for green checkmarks
5. Check the "Errors" column for clear error messages
6. Import the 7 valid items
7. Verify the import summary shows 7 successful imports

## What This Tests

✅ **Auto-fix Features:**
- SKU uppercase and trim
- Name trimming
- Category normalization (spaces to underscores, lowercase)
- UOM uppercase
- Boolean parsing (yes/no → true/false)
- Tag parsing (pipe-separated → array)
- Default values

✅ **CSV Transformation:**
- Flattened dimensions → nested object
- Flattened vendors (vendor_1_*, vendor_2_*, vendor_3_*) → array

✅ **Validation Rules:**
- Required fields (sku, name, category, uom, unit_cost)
- SKU format (XXXX-XXX)
- Category enum
- UOM enum
- Duplicate SKU detection
- At most one preferred vendor
- Cross-field: discontinued_on requires is_active=false

✅ **UX Features:**
- Filter tabs
- Visual status indicators
- Auto-fix display
- Error messages
- Preview before import
