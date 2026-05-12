# CLAUDE.md — Wardrobe Project

Guidelines for Claude Code when working in this repo.

## Project Overview

A personal wardrobe tracker. Single-page static site. Mobile-first. No backend.

## Hard Rules

- **Vanilla HTML, CSS, and JavaScript only** — no frameworks, no libraries, no npm dependencies, no build step
- **No bundler, no transpiler** — everything runs directly in the browser as-is
- **Three files**: `index.html`, `style.css`, `app.js` — keep them separate, don't consolidate
- **Static hosting on Vercel** — nothing that requires a server or runtime

## Data

- All data lives in `wardrobe.json` at the repo root
- The browser cannot write to this file at runtime
- On any add/edit/delete: update the in-memory array AND trigger a download of the full updated `wardrobe.json`
- Never silently discard changes — the download is the save mechanism
- Schema is documented in `README.md` — do not add fields without discussion

## Code Style

- Keep it simple and readable — this is a personal tool, not a product
- No clever abstractions — prefer obvious, straightforward code
- Plain CSS — no utility classes, no CSS-in-JS, no preprocessors
- Use CSS custom properties (variables) for colors and spacing
- Mobile-first media queries

## UI Principles

- Mobile-first — design for ~390px width first, then scale up
- Minimal chrome — every element earns its place
- Filter bar is sticky at the top
- Items grouped by category (Basics → Tops → Bottoms → Outerwear → Footwear → Accessories), sorted alphabetically by name within each group
- FAB (floating action button) for adding items — fixed bottom right
- Bottom sheet or modal for add/edit forms
- No page reloads — all interactions are in-memory

## Seasons & Filtering

- Default filter on load: current season based on calendar date
  - Spring = Mar–May, Summer = Jun–Aug, Fall = Sep–Nov, Winter = Dec–Feb
- Filters AND together — e.g. Fall + Tops shows only fall tops
- "Clear filters" resets to default state (current season only)

## Replacement Logic

- Calculated at runtime from `datePurchased` + `replacementIntervalDays`
- Overdue: today > datePurchased + replacementIntervalDays
- Replace Soon: within 30 days of that date
- OK: no badge shown
- Want-to-try items: no replacement logic applied

## When Making Changes

- Test at mobile width (390px) first
- Don't break the download-on-save flow
- Keep `wardrobe.json` valid JSON at all times
- Placeholder data in `wardrobe.json` is for development — don't hard-code any of it into the JS
