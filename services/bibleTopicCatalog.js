const BIBLE_TOPIC_CATALOG = {
  noahAndNations: {
    title: 'Noah, Shem, Ham, Japheth, and the Nations',
    scriptureChain: ['Genesis 5:32', 'Genesis 6:9-22', 'Genesis 7:1-24', 'Genesis 8:1-22', 'Genesis 9:18-27', 'Genesis 10:1-32', '1 Chronicles 1:4-23'],
    parallelThemes: ['table_of_nations', 'post_flood_lineage', 'shem_ham_japheth', 'canaan', 'mizraim_egypt', 'cush', 'phut'],
  },
  abrahamIsaacJacobIsrael: {
    title: 'Abraham to Isaac to Jacob to Israel',
    scriptureChain: ['Genesis 10:21-31', 'Genesis 11:10-32', 'Genesis 12:1-3', 'Genesis 15:1-21', 'Genesis 17:1-21', 'Genesis 21:1-21', 'Genesis 25:19-34', 'Genesis 32:24-30', 'Genesis 35:9-12'],
    parallelThemes: ['covenant_line', 'abrahamic_promise', 'isaac_covenant', 'jacob_renamed_israel'],
  },
  ishmaelAndIsaac: {
    title: 'Ishmael and Isaac in the Bible',
    scriptureChain: ['Genesis 16:1-16', 'Genesis 17:18-21', 'Genesis 21:9-21', 'Genesis 25:12-18', 'Galatians 4:22-31'],
    parallelThemes: ['abraham_first_son', 'ishmael_descendants', 'isaac_covenant_line'],
  },
  twelveTribes: {
    title: 'The Twelve Tribes of Israel',
    scriptureChain: ['Genesis 29:31-35', 'Genesis 30:1-24', 'Genesis 35:22-26', 'Genesis 49:1-28', 'Exodus 1:1-7', 'Numbers 1:1-54', 'Deuteronomy 33:1-29', 'Revelation 7:4-8'],
    parallelThemes: ['sons_of_jacob', 'tribal_blessings', 'israel_from_genesis_to_revelation'],
  },
  identityCaptivityAwakening: {
    title: 'Israel, Captivity, Dry Bones, and Awakening',
    scriptureChain: ['Deuteronomy 28:15-68', '1 Kings 8:46-53', '2 Kings 17:6-23', 'Jeremiah 16:14-21', 'Ezekiel 37:1-14', 'Luke 21:20-24', 'Romans 11:1-5', 'Romans 11:25-29'],
    parallelThemes: ['captivity', 'scattering', 'dry_bones', 'spiritual_awakening', 'remnant'],
  },
  priestsAndTeachers: {
    title: 'Priests of God and Teaching All Nations',
    scriptureChain: ['Exodus 19:5-6', 'Deuteronomy 33:10', 'Malachi 2:7', 'Isaiah 61:6', 'Matthew 28:19-20', 'Mark 16:15', '1 Peter 2:9'],
    parallelThemes: ['priesthood', 'teaching_all_nations', 'holy_nation', 'gospel_instruction'],
  },
  jesusInBible: {
    title: 'Who Jesus Is from Old Testament to New Testament',
    scriptureChain: ['Genesis 1:26', 'Psalm 110:1', 'Isaiah 9:6-7', 'Isaiah 53:1-12', 'John 1:1-14', 'John 8:56-58', 'Colossians 1:15-17', 'Revelation 1:8', 'Revelation 19:11-16'],
    parallelThemes: ['word_made_flesh', 'king', 'messiah', 'returning_king'],
  },
  sabbath: {
    title: 'The Seventh-Day Sabbath',
    scriptureChain: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Leviticus 23:1-3', 'Isaiah 58:13-14', 'Luke 4:16', 'Acts 13:42-44', 'Acts 17:2', 'Hebrews 4:9'],
    parallelThemes: ['creation_rest', 'fourth_commandment', 'holy_convocation', 'jesus_sabbath_custom', 'apostolic_sabbath_pattern'],
  },
  dietaryLaw: {
    title: 'Clean and Unclean Food',
    scriptureChain: ['Leviticus 11:1-47', 'Deuteronomy 14:1-21', 'Daniel 1:8-16', 'Acts 10:14', 'Acts 10:28', 'Acts 11:1-18', 'Isaiah 66:17'],
    parallelThemes: ['clean_unclean', 'daniel_food_refusal', 'peter_vision_context', 'isaiah_future_judgment'],
  },
  feastDaysHighSabbaths: {
    title: 'Feasts of the LORD and High Sabbaths',
    scriptureChain: ['Leviticus 23:1-44', 'Numbers 28:1-31', 'Numbers 29:1-40', 'Acts 2:1-4', '1 Corinthians 5:7-8', 'Zechariah 14:16-19'],
    parallelThemes: ['passover', 'unleavened_bread', 'pentecost', 'trumpets', 'atonement', 'tabernacles', 'eighth_day'],
  },
  traditionsOfMen: {
    title: 'Traditions of Men versus Commandments of God',
    scriptureChain: ['Deuteronomy 12:29-32', 'Jeremiah 10:1-4', 'Matthew 15:1-9', 'Mark 7:6-13', 'Colossians 2:8'],
    parallelThemes: ['customs_of_people', 'vain_worship', 'commandment_made_void', 'philosophy_and_tradition'],
  },
  resurrectionTimeline: {
    title: 'Three Days and Three Nights / Resurrection Timeline',
    scriptureChain: ['Matthew 12:40', 'Matthew 27:57-66', 'Matthew 28:1-6', 'Mark 16:1-6', 'Luke 24:1-6', 'John 20:1-8'],
    parallelThemes: ['three_days_three_nights', 'empty_tomb', 'already_risen_when_found'],
  },
  lostBooksCanon: {
    title: 'Lost Books, Canon, and Staying with Scripture',
    scriptureChain: ['Deuteronomy 4:2', 'Deuteronomy 12:32', 'Isaiah 8:20', 'Luke 24:44-45', '2 Timothy 3:15-17', 'Revelation 22:18-19'],
    parallelThemes: ['test_every_book', 'law_and_testimony', 'scripture_profitable_for_doctrine', 'do_not_add_or_remove'],
  },
  davidAndKingdom: {
    title: 'David, the Throne, and the Kingdom',
    scriptureChain: ['1 Samuel 16:1-13', '2 Samuel 7:12-16', 'Psalm 89:3-4', 'Psalm 110:1', 'Isaiah 9:6-7', 'Luke 1:30-33', 'Acts 2:29-36', 'Revelation 22:16'],
    parallelThemes: ['davidic_covenant', 'throne_of_david', 'messianic_kingdom'],
  },
  secondComingKingdom: {
    title: 'Second Coming, Last Trump, and Kingdom',
    scriptureChain: ['Daniel 7:13-14', 'Zechariah 14:1-9', 'Matthew 24:29-31', '1 Corinthians 15:51-54', '1 Thessalonians 4:13-18', 'Revelation 11:15', 'Revelation 19:11-21', 'Revelation 20:1-6'],
    parallelThemes: ['son_of_man', 'last_trump', 'kingdom_of_world_becomes_christ', 'reign_with_christ'],
  },
};

module.exports = { BIBLE_TOPIC_CATALOG };
