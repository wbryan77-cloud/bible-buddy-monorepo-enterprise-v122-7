const HISTORICAL_REFERENCE_INDEX = {
  josephus: {
    title: 'Flavius Josephus historical works',
    works: ['The Jewish War', 'Antiquities of the Jews'],
    topics: ['first_century_judea', '70_ad_jerusalem', 'herodians', 'idumea', 'roman_judea'],
    usage: 'Historical support only; never overrides Scripture.'
  },
  romanHistory: {
    title: 'Roman imperial and Judean history references',
    works: ['Tacitus Histories', 'Roman imperial edicts and histories', 'Second Temple period studies'],
    topics: ['rome', 'jerusalem_destruction', 'imperial_religion', 'sabbath_sunday_history'],
    usage: 'Historical support only; keep separate from Bible text.'
  },
  ancientNearEast: {
    title: 'Ancient Near East background',
    works: ['Ancient Near East geography', 'Table of Nations studies', 'Egypt and Canaan studies'],
    topics: ['mizraim', 'canaan', 'edom', 'philistines', 'table_of_nations'],
    usage: 'Contextual geography and history only.'
  },
  feastAndCalendarHistory: {
    title: 'Feast and calendar history references',
    works: ['Second Temple feast observance studies', 'Jewish calendar history', 'biblical calendar studies'],
    topics: ['passover', 'unleavened_bread', 'pentecost', 'tabernacles', 'high_sabbaths'],
    usage: 'Calendar/history support only; Scripture remains primary.'
  },
  caution: 'Modern identity claims, denominational claims, and historical reconstructions must be labeled as historical or interpretive, not direct Scripture, unless the Bible text directly says it.'
};

module.exports = { HISTORICAL_REFERENCE_INDEX };
