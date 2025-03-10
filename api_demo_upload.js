// for postman -- you don't need anything in params, authorization should be set to no auth,
// the headers can be default - in the body, you can use the redcap api playground to get the
// necessary information such as content, action, format, type - make sure you use form-urlencoded
// token = api token, content = record, action = export, format = json, type = flat
// then use fields[0] to start getting data

// for the ripple post - need importtype and updateoption - importtype is the unique study code 
// and updateoption will be all
// You can get the link from the import page on Ripple but change admin to v1
// Authorization is basic auth using ripple username and password
// You do not need to add any headers, and for the body use binary and upload test .xlsx
// once that is done you can export the request


const newman = require('newman'); // require newman (postman) in your project

const xl = require('xlsx'); // require xl - we need this to update excel documents

var run_count = 1; // we will need this to differentiate between exporting from Redcap and importing to ripple

date_string_fname = get_date_string(1); // this gets the current date and time, and it will be useful
// later when we are naming files

// write this block of code, then add stuff to the middle - the stuff to add will be below for
// reading ease

//
newman.run({
    collection: require('./Demos_test.postman_collection.json'),
    reporters: 'cli'
}).on('request', (error, data) => {
    if (error) {
        console.log(error);
        return;
    }
    // add stuff here! Make sure you add }) at the end!

    if (run_count == 1) { // 1 = export from redcap, 2 = import to ripple
        const content = data.response.stream.toString(); // this gets data from the API request
        const contentJSON = JSON.parse(content); // this converts the data to a JSON (javascript object notation) string
    
        const workbook_0_5 = xl.utils.book_new(); // this creates an excel workbook
        
        var aoa_0_5 = []; // this creates an array of arrays of lines of data. Each array is one line of 
        // data in the excel document
        var headers_0_5 = ['globalId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
        'importType']; // this will be the first line in the array of arrays - consists of the headers 
        //needed to import into ripple - we will be importing the demographics (complete once) forms

        aoa_0_5.push(headers_0_5); // this adds the headers to the array of arrays

        var dem_b; // this defines our variables
        var dem_c;
        var dem_cg;
        var first_row = true; // we will need this to add the import code

        for (let i = 0; i < contentJSON.length; i++) {  // this is a for loop that will loop through
            // all of the participants exported from Redcap. The way it exports is a little strange
            // though - all of the participants are exported multiple times for each redcap event
            // they are a part of. Therefore, we need to filter by the relevant redcap event - 
            // hence this next line.

            if (contentJSON[i].redcap_event_name == 'a1223mos_arm_1') { // this is 12-23 months 
                // because the participant I need is this age - in reality, you would want to check all
                // of the events in redcap to capture everybody
                if (contentJSON[i].dem_dem_b_complete == 2){dem_b = 'yes';}else{dem_b = 'no';}
                // these lines look at the data from redcap to see if they are complete
                if (contentJSON[i].dem_dem_c_complete == 2){dem_c = 'yes';}else{dem_c = 'no';}
                if (contentJSON[i].dem_dem_cg_complete == 2){dem_cg = 'yes';}else{dem_cg = 'no';}

                if (first_row) {
                    temp_study_child =  [contentJSON[i].record_id, dem_b, dem_c, 
                    dem_cg, '']; //TODO: Add 0-5 month demo study import code 
                    first_row_child = false;
                }
                else {
                    
                    temp_study_child = [contentJSON[i].record_id, dem_b, dem_c, dem_cg];
                }
                if (contentJSON[i].record_id == 'BGJ430-01-A') { // this limits adding to the excel 
                    //to this one participant - I am only doing this because I want this specific 
                    //participant - in reality, you would want to add all participants
                    aoa_0_5.push(temp_study_child); // push this line of data to the excel document
                }
                
            }

        }

        const aoa_sheet_0_5 = xl.utils.aoa_to_sheet(aoa_0_5, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
        // this line adds the array of arrays to an excel sheet

        xl.utils.book_append_sheet(workbook_0_5, aoa_sheet_0_5, "data");
        // this line adds the sheet to the workbook

        var newFileName_0_5 = "demo/log files demo/log_" + date_string_fname + "_0_5" + ".xlsx";
        // this creates a filename for the workbook

        xl.writeFile(workbook_0_5, newFileName_0_5, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_0_5, "demo/upload files demo/upload_0_5.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        // We need to create two files - one to log every time we upload, and one to do the actual
        // uploading. We need this second file because we need to know the name of the file in advance,
        // and this is an easy way to do it




    }

    run_count += 1; // adds 1 to the run count
})





function get_date_string(m) { //get date for file naming
    // pass in 1 to get minutes

    var date_string = '';

    if (m == 1) {
        const curDate = new Date();
        var day, month, year, hour, minute;

        day = curDate.getDate();
        month = curDate.getMonth() + 1;
        year = curDate.getFullYear();
        hour = curDate.getHours();
        minute = curDate.getMinutes();

        var new_month = '';
        var new_day = '';

        if (day < 10) { new_day = new_day.concat('0', day); } else { new_day = day; }
    
        if (month < 10) { new_month = new_month.concat('0', month); } else { new_month = month; }

        date_string = String(new_month);

        date_string = date_string.concat("-", String(new_day), "-", String(year), "-", String(hour), "-", String(minute));

    }
    else {

        const date = new Date();

        day = date.getDate();
        month = date.getMonth() + 1;
        year = date.getFullYear();
    
        var new_month = '';
        var new_day = '';

        if (day < 10) { new_day = new_day.concat('0', day); } else { new_day = day; }
    
        if (month < 10) { new_month = new_month.concat('0', month); } else { new_month = month; }

        date_string = date_string.concat(new_month, '/', new_day, '/', year);
    }

    return(date_string);

}


function csvJSON(csv){ // will need this function to parse data!! Make sure this is already in the file

    var lines=csv.split("\n");
    var result = [];
  

    var headers=lines[0].split(",");
    for(var i=1;i<lines.length;i++){
  
        var obj = {};
        var currentline=lines[i].split(",");
  
        for(var j=0;j<headers.length;j++){
            obj[headers[j]] = currentline[j];
        }
  
        result.push(obj);
  
    }
  
    //return result; //JavaScript object
    return JSON.stringify(result); //JSON
  }



