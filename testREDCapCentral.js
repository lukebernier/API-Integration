const newman = require('newman'); // require newman in your project
const fs = require('fs');
const xl = require('xlsx');

// call newman.run to pass `options` object and wait for callback
newman.run({
    collection: require('./REDCap Central to Ripple.postman_collection.json'),
    reporters: 'cli'
}).on('request', (error, data) => {
    if (error) {
        console.log(error);
        return;
    }

    const content = data.response.stream.toString();
    const contentJSON = JSON.parse(content);

    console.log(contentJSON)


})