# Missing Source Extraction Plan

**Phase:** 3Q Part B
**Date:** 2026-06-09T22:16:41.343Z

**Missing before recovery:** 202
**Cursor can extract now:** 202
**Manual required:** 153
**Resolved in 3Q:** 109
**URL fetches attempted:** 30

## Priority buckets

| Bucket | Count |
|--------|-------|
| withSourceUrl | 202 |
| pdfs | 106 |
| youtubeDescriptions | 169 |
| spanishLessons | 0 |
| campIog | 73 |
| icojHandouts | 8 |
| qaItems | 202 |

## Recommended actions

### cursor_fetch_public_url (35)

- Power Over The Nations
- God: Is It Two of Them or Just One, Who Talks To Himself
- Feast Of Unleavened Bread 2022
- The Destruction and Restoration of Israel
- Shows - The Israel of God
- IOG Buffalo - "The Destruction & Restoration of Israel"
- IOG X (Twitter)
- Emotional: I lost someone I love.
- Emotional: I am angry with God.
- Emotional: Today has been a rough day. I had to let go of someone I love.
- Emotional: My mother has Alzheimer's and I feel overwhelmed.
- Emotional: I'm so angry I can't think straight.
- Emotional: I'm worried about money and bills this month.
- Emotional: I feel guilty about my past.
- Emotional: I feel like God is silent.
- _…20 more_

### fetch_youtube_description_or_transcript (61)

- IOG Birmingham - "This Little Light of Mine, I'm Gonna Let It Shine"
- IOG - "El gran cambio" 2026
- IOG - "The Gospel By The Prophet Zechariah" 2026
- IOG Washington DC. - "The Soul Is The Body, Not Inside The Body"
- IOG Detroit - "Our God Dwells In The Thick Darkness"
- IOG Baton Rouge - "Adversity Builds Character, If You Let It"
- IOG Phoenix - "For Thine Is The Kingdom, And The Power, And The Glory, Forever"
- IOG - "JESUS: The Unknown God" 2026
- IOG Houston - "Understanding The Fear of the Lord"
- IOG Jackson - "Breaking Bonds & Spiritual Strongholds"
- IOG Charlotte - "The Purpose of the Ministry: Service Unto Salvation"
- IOG Bay Area - "Hath God Cast Away His People Israel?"
- IOG Orlando - "The Lord's Day Is The Last Day"
- IOG — «Israel reemplazado por su hermano Esaú» 2026
- IOG — «Los frutos del Espíritu, la imagen de Dios en el hombre y las claves para entrar en el...»
- _…46 more_

### link_existing_corpus_scriptures (106)

- IOG St. Louis - "The Powers That Be"
- The Sun Never Sets British Empire WORD doc
- Mixed: Thank you. That helps me grieve with hope.
- The Sun Never Sets British Empire WORD doc
- IOG St. Louis - "The Powers That Be"
- IOG St. Louis - "The Powers That Be"
- 19
- 32
- 34
- 35
- 36
- 37
- 38
- 39
- 41
- _…91 more_

## IOG / ICOJ re-scrub guidance

IOG/ICOJ public URLs in registry and scrubbed corpus can be re-processed by Cursor via cursor_fetch_public_url and extract_pdf_text without production changes. Spanish and caption-blocked YouTube items require manual transcript upload.

## Recovery results sample

- **IOG Baton Rouge - "Adversity Builds Character, If You Let It"** — url_re_scrub (1 scriptures)
- **IOG St. Louis - "The Powers That Be"** — local_corpus_match (10 scriptures)
- **IOG — «Los frutos del Espíritu, la imagen de Dios en el hombre y las claves para entrar en el...»** — url_re_scrub (1 scriptures)
- **IOG - "Israel el cautivo: de Babilonia a Babilonia" 2026** — url_re_scrub (1 scriptures)
- **The Sun Never Sets British Empire WORD doc** — local_corpus_match (10 scriptures)
- **Mixed: Thank you. That helps me grieve with hope.** — local_corpus_match (10 scriptures)
- **The Sun Never Sets British Empire WORD doc** — local_corpus_match (10 scriptures)
- **IOG St. Louis - "The Powers That Be"** — local_corpus_match (10 scriptures)
- **IOG St. Louis - "The Powers That Be"** — local_corpus_match (10 scriptures)
- **19** — local_corpus_match (10 scriptures)
- **32** — local_corpus_match (10 scriptures)
- **34** — local_corpus_match (10 scriptures)
- **35** — local_corpus_match (10 scriptures)
- **36** — local_corpus_match (10 scriptures)
- **37** — local_corpus_match (10 scriptures)
- **38** — local_corpus_match (10 scriptures)
- **39** — local_corpus_match (10 scriptures)
- **41** — local_corpus_match (10 scriptures)
- **42** — local_corpus_match (10 scriptures)
- **45** — local_corpus_match (10 scriptures)
