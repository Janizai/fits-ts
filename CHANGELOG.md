# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-05-11

### Added
- `lastIndexWithData` in `Fits` for tracking which HDU’s data is currently cached 
- `ensureHeadersParsed` in `FitsReader` to prevent redundant header parsing  
- `makePadding` utility for consistent block padding in `FitsWriter`  

### Changed
- Use nullish coalescing (`??=`) when initializing `loadPromise` in `Fits`  
- Unified `FitsData` into three explicit interfaces: `ImageData`, `TableData`, and `HeaderData`  
- `FitsHeader.get` / `.getNumber` / `.getString` / `.getComment` now return `null` instead of throwing on missing keys  
- Refactored `addHDU`, `getData`, async iterators (`entries`), and serialization (`toBytes`) to handle optional data cleanly  
- Overhauled header/data parsing in `FitsIO`, simplified offset math, removed vestigial error blocks  
- Enhanced `ImageIO` and `TableIO` to operate on TypedArrays and fully support all FITS `BITPIX` values  
- Improved `formatHeaderLine` to align numeric vs string values within 20-char fields and pad comments correctly  
- Updated `stats` util to accept `Iterable<number>`, filter out non-finite values, and compute robust statistics

### Fixed
- Brought all tests in line with new APIs: switched to TypedArrays in fixtures, updated expected error messages, and renamed spec files


## [0.1.1] - 2025-04-07
### Fixed
- Detecting correct data type based on header keywords and values

## [0.1.0] - 2025-04-04

### Added
- High-level `Fits` interface supporting both reading and writing of FITS files with a simple API.
- Full implementation of `FitsWriter` and `FitsReader`, supporting round-trip serialization.
- Support for automatically generating minimal FITS headers when missing.
- Auto-population of required header fields like `NAXIS1`, `NAXIS2`, and `TFIELDS`.
- New statistics utility: `getStats()` for tables and image HDUs.
- Extended `FitsHeader` typing and validation.
- Added `entries()` and `entriesArray()` for iteration over HDUs with lazy data loading.
- Robust test coverage for ImageIO, TableIO, HeaderIO, FitsReader, FitsWriter, and high-level `Fits`.
- Optional gzipped input support via `pako`.

### Changed
- Refactored most of the FITS I/O code for clarity, testability, and separation of concerns.
- Rewrote `FitsHeader` parsing to handle modern FITS quirks more reliably.
- Ensured all exported data types support both Node.js and browser environments.
- Significantly improved coverage and reliability of unit tests.
- Internal refactor to simplify and unify how `FitsHDU` is constructed and handled.

### Fixed
- Corrected parsing of fields like `TFORMn`, `TTYPEn`, and `TUNITn` in tables.
- Fixed multiple endian-ness and byte offset issues in data parsing.
- Ensured `BSCALE`/`BZERO` default handling in both image reader and writer paths.

### Removed
- Browser-first assumptions: Switched to a Node-first setup
- Deprecated Blob-specific assumptions in internal file reader logic.



## [0.0.1] - 2025-03-28
### Added
- Initial development version of `fits-ts`, a TypeScript library for handling `.fits` files.
- Core functionality for parsing FITS headers, tables, and image data.
- Support for 8-bit, 16-bit, 32-bit, and floating-point image types.
- Application of `BSCALE` and `BZERO` for scaling image data.
- Parsing of FITS tables with support for multiple column types (`L`, `B`, `I`, `J`, `E`, `D`, `A`).
- Utility functions for handling FITS data types and field parsing.
- Unit tests for core parsers (Image, Table, Header).
- Support for reading FITS files from both gzipped and non-gzipped buffers.
- Preliminary documentation and usage examples.

### Known Issues
- No support for compressed images beyond gzip.
- Limited handling of complex FITS structures or extensions.
- No support for hierarchical keywords or advanced metadata parsing.
- Limited error handling and validation for malformed FITS files.
