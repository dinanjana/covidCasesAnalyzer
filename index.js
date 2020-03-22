const DataProvider = require('./DataProvider');
const AnalyzerService = require('./AnalyzerService');

DataProvider.init().then((cases) => { AnalyzerService.modelProvinceData(cases, 'Hubei')});