const tf = require('@tensorflow/tfjs-node');
const _ = require('lodash');

const extractGivenProvinceData = (allCases, province) => _.map(
    allCases, (casesPerDate) => _.find(
        casesPerDate, (casesPerProvince) => casesPerProvince['Province/State'] === province));

const filterDataForRegressionAnalysis = data => _.map(
    data, ({ Confirmed, Deaths, Recovered }, day) =>
        ({ Confirmed: parseInt(Confirmed), Deaths: parseInt(Deaths), Recovered: parseInt(Recovered), day}));

const createSequentialModel = () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({inputShape: [1], units: 1, useBias: true}));
    model.add(tf.layers.dense({units: 1, useBias: true}));
    return model;
};

const convert2DDataToTensors = (fields, data) => {
    return tf.tidy(() => {
        const inputs = data.map(d => d[fields[0]]);
        const labels = data.map(d => d[fields[1]]);

        const inputTensor = tf.tensor2d(inputs, [inputs.length, 1]);
        const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

        const inputMax = inputTensor.max();
        const inputMin = inputTensor.min();
        const labelMax = labelTensor.max();
        const labelMin = labelTensor.min();

        const normalizedInputs = inputTensor.sub(inputMin).div(inputMax.sub(inputMin));
        const normalizedLabels = labelTensor.sub(labelMin).div(labelMax.sub(labelMin));

        return {
            inputs: inputTensor,
            labels: normalizedLabels,
            // Return the min/max bounds so we can use them later.
            inputMax,
            inputMin,
            labelMax,
            labelMin,
        }
    });
};

async function trainModel(model, inputs, labels) {
    model.compile({
        optimizer: tf.train.adam(),
        loss: tf.losses.meanSquaredError,
        metrics: ['mse'],
    });

    const batchSize = 16;
    const epochs = 50;

    await model.fit(inputs, labels, {
        batchSize,
        epochs,
        shuffle: true,
        callbacks: (data) => {
            //console.log('Res', JSON.stringify(data))
        }
    });

    return model;
}

function predict (model, normalizationData, input) {
    const { inputMax, inputMin, labelMin, labelMax } = normalizationData;

    // Generate predictions for a uniform range of numbers between 0 and 1;
    // We un-normalize the data by doing the inverse of the min-max scaling
    // that we did earlier.
    const [xs, preds] = tf.tidy(() => {

        const xs = tf.linspace(59, 159, 100);
        const preds = model.predict(xs.reshape([100, 1]));

        const unNormPreds = preds
            .mul(labelMax.sub(labelMin))
            .add(labelMin);

        // Un-normalize the data
        return [xs.dataSync(), unNormPreds.dataSync()];
    });
    console.log('Previous',JSON.stringify(input ? input.map(d => d.Confirmed) : {}));
    console.log('Result', JSON.stringify(preds));
}

async function modelProvinceData (allCases, province, input) {

    //console.log(province, JSON.stringify(allCases))

    const extractedData = extractGivenProvinceData(allCases, province);
    const filteredData = filterDataForRegressionAnalysis(extractedData);

    console.log(JSON.stringify(filteredData))

    const provinceDataModel = createSequentialModel();
    const { inputs, labels, inputMax, inputMin, labelMax, labelMin } =
        convert2DDataToTensors(['day','Confirmed'], filteredData);

    const model = await trainModel(provinceDataModel, inputs, labels);

    predict(model, {inputMax, inputMin, labelMax, labelMin}, filteredData);
}

module.exports = {
    modelProvinceData,
};

