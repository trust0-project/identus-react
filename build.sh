#!/usr/bin/env bash
set -e  # Exit on any error
rm -rf build
npx tsup --config tsup.esm.ts --dts
npx tsup --config tsup.cjs.ts --dts

