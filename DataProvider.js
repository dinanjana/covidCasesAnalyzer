const dataLocation = './data';
const git = require('simple-git/promise')(dataLocation);
const fs = require('fs');
const csv = require('csvtojson');

const repo = 'COVID-19';
const repoURL = `https://github.com/CSSEGISandData/${repo}.git`;
const branch = 'master';
const dataPath = 'csse_covid_19_data/csse_covid_19_daily_reports';
const caseDataLocation = `${dataLocation}/${repo}/${dataPath}`;

let data = null;

const filterCasesData = async (files) => {
    const cases = {};
    for(const file of files) {
        if (file !== '.gitignore' && file !== 'README.md') {
            const [date] = file.split('.');
            cases[date] = await csv().fromFile(`${caseDataLocation}/${file}`);
        }
    }
    return cases;
};

const readData = () => fs.readdirSync(caseDataLocation);

const getData = () => {
    if (!fs.existsSync(`${dataLocation}/${repo}`)) {
        return git.init().then(() => git.clone(repoURL));
    } else {
        return git.pull(repoURL, branch);
    }
};

const init = function () {
    return getData().then(readData).then(filterCasesData);
};

module.exports = {
  init,
};