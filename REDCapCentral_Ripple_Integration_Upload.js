const newman = require('newman'); // require newman in your project
const fs = require('fs');
const xl = require('xlsx');

//Get current date for file naming
date_string_fname = get_date_string(1);


// call newman.run to pass `options` object and wait for callback
newman.run({
    collection: require('./RCC_to_Ripple_Updated.postman_collection.json'),
    reporters: 'cli'
}).on('request', (error, data) => {
    if (error) {
        console.log(error);
        return;
    }
    // get data from REDCap Central
    const content = data.response.stream.toString();
    const contentJSON = JSON.parse(content);

    
    const workbook_study = xl.utils.book_new();
    const workbook_global = xl.utils.book_new();

    //0-5 import file creation
    var aoa_study = [];
    var headers_study = ['globalId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
    'cv.dem_addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
    'cv.forms_to_be_completed','event.child_anthropometry.completed',
    'event.child_anthropometry.completedDate', 'event.mom_anthropometry.completed','event.mom_anthropometry.completedDate', 'importType'];

    aoa_study.push(headers_study);

    //global import file creation
    var aoa_global = [];

    var headers_global = ['globalId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
    'cv.dem_addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
    'importType'];

    aoa_global.push(headers_global);

    //define vars
    var temp_study_mom = [];
    var temp_study_child = [];
    var dem_b;
    var dem_c;
    var dem_cg;
    var dem_addr;
    var mhc;
    var mhb;
    var head;
    var child_an;
    var mom_an;
    var first_row_child = true;
    var first_row_mom = true;

    var date_mom_anthro; var date_child_anthro;

    var ids_in_study = ['T125', 'T126']; //TODO : LOAD FROM FILE
    
    //create array of arrays for excel files
    for (let i = 0; i < contentJSON.length; i++) {
        
        if (contentJSON[i].redcap_event_name == 'preearly_arm_1') {  // change to a05mos_arm_1
            forms = [contentJSON[i].prg_subuse_r_complete, contentJSON[i].prg_msuppsfbf_complete, contentJSON[i].cnp_prams_complete, 
                contentJSON[i].cnp_weds_complete, contentJSON[i].cnp_pdep8a_complete, contentJSON[i].cnp_panx8a_complete, 
                contentJSON[i].cnp_ntpss10_complete, contentJSON[i].cnp_pes4a_complete, contentJSON[i].cnp_pinfs4a_complete, 
                contentJSON[i].cnp_pinstrs4a_complete, contentJSON[i].cgw_pgls5a_complete, contentJSON[i].cgw_sha_complete, 
                contentJSON[i].bpe_heshs_c_complete, contentJSON[i].chb_shinf_complete, contentJSON[i].hhx_chl_complete, 
                contentJSON[i].hse_csi4_complete];

            d = get_date_string(0);

            if (contentJSON[i].dem_dem_b_complete == 2){dem_b = 'Yes';}else{dem_b = 'No';}
            if (contentJSON[i].dem_dem_c_complete == 2){dem_c = 'Yes';}else{dem_c = 'No';}
            if (contentJSON[i].dem_dem_cg_complete == 2){dem_cg = 'Yes';}else{dem_cg = 'No';}
            if (contentJSON[i].dem_addr_hx_complete == 2){dem_addr = 'Yes';}else{dem_addr = 'No';}
            if (contentJSON[i].prg_pa_complete == 2){mom_an = 'TRUE';}else{mom_an = 'FALSE';} //pregnancy anthro - change to 0-5
            if (contentJSON[i].cph_clwt_0_23m_complete == 2){child_an = 'TRUE';}else{child_an = 'FALSE';}
            if (contentJSON[i].hhx_mh2_c_complete == 2){mhc = 'Yes';}else{mhc = 'No';}
            if (contentJSON[i].hhx_mh2_f_complete == 2){mhb = 'Yes';}else{mhb = 'No';}
            if (contentJSON[i].cph_head_complete == 2){head = 'TRUE';}else{head = 'FALSE';}
            if (mom_an == 'TRUE'){date_mom_anthro = d;}else{date_mom_anthro = '';}
            if (child_an == 'TRUE'){date_child_anthro = d;}else{date_child_anthro = '';}
            


            //global file aoa
            if (ids_in_study.includes(contentJSON[i].record_id)) {

                if (first_row_mom) {
                    temp_study_mom = [contentJSON[i].record_id, dem_b, dem_c, 
                    dem_cg, dem_addr, mhc, mhb, '']; //TODO: Add import type 'global'

                    first_row_mom = false;
                }
                else {
                    temp_study_mom = [contentJSON[i].record_id, dem_b, dem_c, 
                    dem_cg, dem_addr, mhc, mhb];
                }

                aoa_global.push(temp_study_mom);

                //study file aoa
                if (first_row_child) {
                    
                    temp_study_child =  [contentJSON[i].record_id, dem_b, dem_c, 
                    dem_cg, dem_addr, mhc, mhb, get_forms_tbc(forms), 
                    child_an, date_child_anthro, mom_an, date_mom_anthro, '']; //TODO: Add 0-5 month study import code
                    
                    first_row_child = false;
                }
                else {
                    
                    temp_study_child = [contentJSON[i].record_id, dem_b, dem_c, 
                    dem_cg, dem_addr, mhc, mhb, get_forms_tbc(forms), 
                    child_an, date_child_anthro, mom_an, date_mom_anthro];
                }
                aoa_study.push(temp_study_child);
            }
        }
        
    }

    const aoaTest_study = xl.utils.aoa_to_sheet(aoa_study, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
    const aoaTest_global = xl.utils.aoa_to_sheet(aoa_global, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});

    xl.utils.book_append_sheet(workbook_study, aoaTest_study, "data");
    xl.utils.book_append_sheet(workbook_global, aoaTest_global, "data");

    var newFileName_study = "Log Files/log_" + date_string_fname + "_study" + ".xlsx";
    var newFileName_global = "Log Files/log_" + date_string_fname + "_global" + ".xlsx";

    //Save one version as a way to look at what happened for every run
    xl.writeFile(workbook_study, newFileName_study, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
    xl.writeFile(workbook_study, newFileName_global, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});

    //Save another version for the actual import - I cannot edit the .json file to update the file path so
    // every time time this runs it needs to have the same name for the excel file import
    xl.writeFile(workbook_study, "Upload Files/upload_study.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
    xl.writeFile(workbook_global, "Upload Files/upload_global.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
    
})

function get_forms_tbc(forms) {

    keys = {"key":["substance_use_recall | ", "maternal_supplements_short_form_breastfeeding | ", "prams_stressful_life_events_in_pregnancy | ", 
    "the_everyday_discrimination_scale | ", "promis_depression_8a | ",  "promis_anxiety_8a | ",  "percieved_stress_scale_10_item | ", 
    "promis_emotional_support_4a | ",  "promis_informational_support_4a | ", "promis_instrumental_support_4a | ", 
    "promis_general_life_satisfaction_5a | ", "sleep_health_of_adults | ", "household_exposure_to_secondhand_smoke_current | ", 
    "sleep_health_of_infants | ", "caregiver_health_literacy | ", "couples_satisfaction_index_4_item | "]};

    var to_add = ""

    // add relevant forms to string for ripple import
    for (var i = 0; i < forms.length; i++) {
        if (forms[i] != 2 && forms[i] != 1) {
            to_add = to_add.concat(keys.key[i]);
        }

    }

    //remove last three characters
    var temp = to_add.split('');
    var length = temp.length;
    if (length > 0){
        temp.splice(length - 4, 3);
        to_add = temp.join('');
    }
    else {
        to_add = 'None';
    }
    
    
    return to_add;

}

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
