## The problem

India's High Courts publish case pendency, disposal, and judge vacancy data, but almost never in a form anyone can actually use. It's scattered across PDFs, inconsistent table layouts, and portals that change structure every few months. The data exists. Nobody can read it at scale.

## What it does

Judiciary Tracker pulls from public court websites on a schedule, normalizes whatever it finds into a consistent schema, and presents pendency, disposal rate, and vacancy trends in a readable dashboard. No login walls, no PDF exports, no waiting on an RTI request for numbers that are already technically public.

## Why it matters

Judge vacancy is one of the clearest, most measurable levers on case backlog in Indian courts, and yet it's one of the hardest numbers to actually pin down over time. Once this data is presented in a readable, trend-aware format, the framing of "courts are slow" gets sharper: it's not slowness in the abstract, it's specific vacancies, specific courts, specific years.

## Status

Actively maintained. New High Courts get added as scrapers stabilize for them — see [Court Scraper](/projects/court-scraper/) for the ingestion layer this runs on.
