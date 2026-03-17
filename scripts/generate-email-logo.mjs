#!/usr/bin/env node
// One-time script to generate email-logo.png from logo-mark.svg
// Usage: node scripts/generate-email-logo.mjs

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const svgPath = resolve(root, 'public/logo-mark.svg')
const outPath = resolve(root, 'public/email-logo.png')

const svg = readFileSync(svgPath)

await sharp(svg)
  .resize({ width: 200, height: 130, fit: 'inside' })
  .png()
  .toFile(outPath)

const { size } = await sharp(outPath).metadata().then(m => ({ size: m.size }))
console.log(`Created ${outPath} (${size ?? 'unknown'} bytes)`)
