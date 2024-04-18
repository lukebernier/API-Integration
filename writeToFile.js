const newman = require('newman'); // require newman in your project
const fs = require('fs');
const xl = require('xlsx');


// call newman.run to pass `options` object and wait for callback
newman.run({
    collection: require('./Newman Test.postman_collection_test.json'),
    reporters: 'cli'
}).on('request', (error, data) => {
    if (error) {
        console.log(error);
        return;
    }

    const fileName = `response ${data.item.name}.txt`;
    const content = data.response.stream.toString();
    const contentJSON = JSON.parse(content);

    /*
    fs.writeFile(fileName, content, function (error) {
        if (error) {
            console.error(error);
        }
    });
    */
    console.log('entering json_to_sheet');
    const worksheet = xl.utils.json_to_sheet(contentJSON, {raw:false, cellDates:true,cellText:false,dateNF:'mm/dd/yyyy'});
    const workbook = xl.utils.book_new();

    /*
    for (let i = 0; i < 1200; i++ ) {

        for( let j = 0; j < 200; j++) {
            curCell = {c:j, r:i}


        }


    }
*/
    console.log('\ncreated ws and wb');
    console.log(worksheet);

    const JSONTest = xl.utils.sheet_to_json(worksheet, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
    console.log('\ndata:');
    console.log(JSONTest);
    console.log(JSONTest.length)
    var aoa = [];
    var headers = ['globalId', 'firstName', 'lastName', 'birthday' , 'importType'];
    aoa.push(headers);
    var temp = [];
    for (let i = 0; i < JSONTest.length; i++) {
        const d = new Date(2000, 2, 24);
        if (i == 0) {
            temp = [JSONTest[i].record_id, JSONTest[i].name_first, JSONTest[i].name_last, d, 'global'];
        }
        else {
            temp = [JSONTest[i].record_id, JSONTest[i].name_first, JSONTest[i].name_last, d];
        }
        aoa.push(temp);
      
    }

    console.log(aoa);
    const aoaTest = xl.utils.aoa_to_sheet(aoa, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
    console.log(aoaTest);

    xl.utils.book_append_sheet(workbook, aoaTest, "data");
    console.log('appended sheet');

    xl.writeFile(workbook, 'test.xlsx', {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
    console.log('created file');


    //console.log('Request name:' + data.item.name);
    //console.log(data.response.stream.toString());
})

