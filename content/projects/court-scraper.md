## The problem

Every Indian court — district, High Court, Supreme Court — publishes case data through its own portal, its own markup, its own quirks. There's no shared schema. A scraper that works for one High Court breaks on the next.

## What it does

Court Scraper is a set of scrapers, one family per court tier, that pull raw case listings and normalize them into a single consistent schema: case number, filing date, status, listed dates, disposal date, where available. It's the ingestion layer that [Judiciary Tracker](/projects/judiciary-tracker/) runs on top of.

## What was actually hard

Court websites are not built for this. Pagination breaks silently, table structures shift without warning between High Courts, and several portals actively rate-limit or block obvious scraping patterns. Most of the effort went into making the scrapers resilient to that, not into the scraping itself.

## Status

Active. District court coverage is still expanding — High Courts and the Supreme Court are stable.
