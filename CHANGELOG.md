# Changelog

All notable changes to this project will be documented in this file.

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
