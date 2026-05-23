const { ESCHATOLOGY_REFERENCE_CATALOG } = require('./eschatologyReferenceCatalog');
const { FRUITS_REFERENCE_CATALOG } = require('./fruitsReferenceCatalog');
const { MARRIAGE_REFERENCE_CATALOG } = require('./marriageReferenceCatalog');
const { WISDOM_REFERENCE_CATALOG } = require('./wisdomReferenceCatalog');
const { PARABLES_REFERENCE_CATALOG } = require('./parablesReferenceCatalog');
const { RESURRECTION_REFERENCE_CATALOG } = require('./resurrectionReferenceCatalog');
const { PROPHECY_SYMBOL_CATALOG } = require('./prophecySymbolCatalog');
const { PRIESTHOOD_TORAH_CATALOG } = require('./priesthoodTorahCatalog');

const REFERENCE_CATALOG_REGISTRY = {
  eschatology: ESCHATOLOGY_REFERENCE_CATALOG,
  fruits: FRUITS_REFERENCE_CATALOG,
  marriage: MARRIAGE_REFERENCE_CATALOG,
  wisdom: WISDOM_REFERENCE_CATALOG,
  parables: PARABLES_REFERENCE_CATALOG,
  resurrection: RESURRECTION_REFERENCE_CATALOG,
  prophecy: PROPHECY_SYMBOL_CATALOG,
  priesthood: PRIESTHOOD_TORAH_CATALOG
};

module.exports = { REFERENCE_CATALOG_REGISTRY };
