const newman = require('newman'); // require newman in your project
const fs = require('fs');
const xl = require('xlsx');

//Get current date for file naming
date_string_fname = get_date_string(1);
var redcap_run = 1; // 1 = export global from ripple, 2 = export study from ripple, 3 = export redcap, 4 = import study, 5 = import global
var ids_in_study = [];
var familyId_in_study = [];
var partner_ids = [];
var partner_ids_family = [];
var prev_forms = [];

// call newman.run to pass `options` object and wait for callback
newman.run({
    collection: require('./RCC to Ripple.postman_collection.json'),
    reporters: 'cli'
}).on('request', (error, data) => {
    if (error) {
        console.log(error);
        return;
    }

    if (redcap_run == 1) {
        // get ids to update and partner ids
        const content = data.response.stream.toString();
        const content_csv = csvJSON(content);
        const cn = JSON.parse(content_csv);

        for (let i = 0; i < cn.length; i++) {

            if (cn[i].tags == "Test participant" ) {
                delete cn[i];
            }
            else if (cn[i]["cv.participant_type"] == "Preconception Partner Participant") {
                partner_ids.push(cn[i].globalId);
                partner_ids_family.push(cn[i].familyId);
            }
            else {
                ids_in_study.push(cn[i].globalId);
                familyId_in_study.push(cn[i].familyId);
            }
        }

    }
    else if (redcap_run == 2) {
        // get cv.forms_to_be_completed 
        // The purpose of this is because ECHO keeps adding forms even though participants have already completed their visit
        // I do not want the cv.forms_to_be_completed to be updated for participants who completed all of the surveys that were available 
        // to them - their visit is over and they do not have any forms left to be completed

        const content = data.response.stream.toString();
        const content_csv = csvJSON(content);
        const cn = JSON.parse(content_csv);
        
        for (let i = 0; i < cn.length; i++) {
            if (cn[i]['cv.forms_to_be_completed'] == "None" ) {
                prev_forms.push(cn[i].globalId);
            }
        }

    }
    else if (redcap_run == 3) {
        // get data from REDCap Central
        const content = data.response.stream.toString();
        const contentJSON = JSON.parse(content);

        
        const workbook_study = xl.utils.book_new();
        const workbook_global = xl.utils.book_new();

        //0-5 import file creation
        var aoa_study = [];
        var headers_study = ['globalId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
        'cv.addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
        'cv.forms_to_be_completed', 'cv.pi_con_completed', 'importType'];

        aoa_study.push(headers_study);

        //global import file creation
        var aoa_global = [];

        var headers_global = ['globalId', 'familyId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
        'cv.addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
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
        var duplicates_mom = [];
        var duplicates_child = [];
        var pi_con;

        var date_mom_anthro; var date_child_anthro;

        
        //create array of arrays for excel files
        for (let i = 0; i < contentJSON.length; i++) {
            index = 0;
            if (contentJSON[i].redcap_event_name == 'preearly_arm_1') {
                if (contentJSON[i].dem_dem_b_complete == 2){dem_b = 'yes';}else{dem_b = 'no';}
                if (contentJSON[i].dem_dem_c_complete == 2){dem_c = 'yes';}else{dem_c = 'no';}
                if (contentJSON[i].dem_dem_cg_complete == 2){dem_cg = 'yes';}else{dem_cg = 'no';}
                if (contentJSON[i].dem_addr_complete == 2){dem_addr = 'yes';}else{dem_addr = 'no';}
                if (contentJSON[i].hhx_mh2_f_complete == 2){mhb = 'yes';}else{mhb = 'no';}
            }

            if (contentJSON[i].redcap_event_name == 'pre3trm_arm_1') {
                if (contentJSON[i].dem_dem_b_complete == 2 || dem_b == 'yes'){dem_b = 'yes';}else{dem_b = 'no';}
                if (contentJSON[i].dem_dem_c_complete == 2 || dem_c == 'yes'){dem_c = 'yes';}else{dem_c = 'no';}
                if (contentJSON[i].dem_dem_cg_complete == 2 || dem_cg == 'yes'){dem_cg = 'yes';}else{dem_cg = 'no';}
                if (contentJSON[i].dem_addr_complete == 2 || dem_addr == 'yes'){dem_addr = 'yes';}else{dem_addr = 'no';}
                if (contentJSON[i].hhx_mh2_f_complete == 2 || mhb == 'yes'){mhb = 'yes';}else{mhb = 'no';}
            }
            if (contentJSON[i].redcap_event_name == 'a05mos_arm_1') {  // change to a05mos_arm_1
                forms = [contentJSON[i].prg_subuse_r_complete, contentJSON[i].prg_msuppsfbf_complete, contentJSON[i].cnp_prams_complete, 
                    contentJSON[i].cnp_weds_complete, contentJSON[i].cnp_pdep_cat_complete, contentJSON[i].cnp_panx_cat_complete, 
                    contentJSON[i].cnp_ntpss10_complete, contentJSON[i].cnp_pes_cat_complete, contentJSON[i].cnp_pinfs_cat_complete, 
                    contentJSON[i].cnp_pinstrs_cat_complete, contentJSON[i].cgw_pgls_cat_complete, contentJSON[i].cgw_sha_complete, 
                    contentJSON[i].bpe_heshs_c_complete, contentJSON[i].chb_shinf_complete, contentJSON[i].hhx_chl_complete, 
                    contentJSON[i].hse_csi4_complete, contentJSON[i].chb_ifp_complete, contentJSON[i].dem_sta_complete,
                    contentJSON[i].dem_rei_complete, contentJSON[i].cnp_ace_complete, contentJSON[i].cnp_bce_complete];
                    
                d = get_date_string(0);

                if (contentJSON[i].prg_pa_complete == 2){mom_an = 'TRUE';}else{mom_an = 'FALSE';} //pregnancy anthro - change to 0-5
                if (contentJSON[i].cph_clwt_0_23m_complete == 2){child_an = 'TRUE';}else{child_an = 'FALSE';}
                if (contentJSON[i].hhx_mh2_c_complete == 2){mhc = 'yes';}else{mhc = 'no';}
                if (contentJSON[i].cph_head_complete == 2){head = 'TRUE';}else{head = 'FALSE';}
                if (mom_an == 'TRUE'){date_mom_anthro = d;}else{date_mom_anthro = '';}
                if (child_an == 'TRUE'){date_child_anthro = d;}else{date_child_anthro = '';}
                if (contentJSON[i].adm_pi_con_complete == 2){pi_con = 'yes';}else{pi_con = '';}
                if (contentJSON[i].hhx_mh2_f_complete == 2 || mhb == 'yes'){mhb = 'yes';}else{mhb = 'no';}


                //global file aoa
                if (ids_in_study.includes(contentJSON[i].record_id)) {
                    
                    var index = 0;

                    index = ids_in_study.indexOf(contentJSON[i].record_id);

                    if (first_row_mom) {

                        var split = contentJSON[i].record_id.split('');
                        var length = split.length;
                       
                        split[length-1] = '0';
                        record_id = split.join('');
                        
                        temp_study_mom = [record_id, familyId_in_study[index], dem_b, dem_c, 
                        dem_cg, dem_addr, mhc, mhb, '']; //TODO: Add import type 'global'
                            
                       

                        first_row_mom = false;
                    }
                    else {
                        var split = contentJSON[i].record_id.split('');
                        var length = split.length;
                       
                        split[length-1] = '0';
                        record_id = split.join('');
                        
                        temp_study_mom = [record_id, familyId_in_study[index], dem_b, dem_c, 
                        dem_cg, dem_addr, mhc, mhb]
                    }

                    if (duplicates_mom.includes(record_id)){}
                    else {
                        aoa_global.push(temp_study_mom);
                    }
                    duplicates_mom.push(record_id);

                    //study file aoa
                    if (first_row_child) {
                        
                        temp_study_child =  [contentJSON[i].record_id, dem_b, dem_c, 
                        dem_cg, dem_addr, mhc, mhb, get_forms_tbc(forms), pi_con, '']; //TODO: Add 0-5 month study import code 
                        first_row_child = false;
                    }
                    else {
                        
                        temp_study_child = [contentJSON[i].record_id, dem_b, dem_c, 
                        dem_cg, dem_addr, mhc, mhb, get_forms_tbc(forms), pi_con];
                    }

                    if (prev_forms.includes(contentJSON[i].record_id)) {
                        temp_study_child[7] = 'none';
                    }

                    aoa_study.push(temp_study_child);
                    
                }
            }
            
        }

        for (j = 0; j < partner_ids.length; j++) {

            var split = partner_ids_family[j].split('');
            var length = split.length;
            var id = '';

            if (split[length-2] == 'C') {
                split[length-3] = '';
                split[length-2] = '';
                split[length-1] = '';
            }
            id = split.join('');

            aoa_global.push([partner_ids[j], id])

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
    
        
    }  
    redcap_run = redcap_run + 1;     
})

function csvJSON(csv){

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
  
    return JSON.stringify(result); //JSON
  }

function get_forms_tbc(forms) {

    keys = {"key":["substance_use_recall|", "maternal_supplements_short_form_breastfeeding|", "prams_stressful_life_events_in_pregnancy|", 
    "the_everyday_discrimination_scale|", "promis_depression_8a|",  "promis_anxiety_8a|",  "perceived_stress_scale_10_item|", 
    "promis_emotional_support_4a|",  "promis_informational_support_4a|", "promis_instrumental_support_4a|", 
    "promis_general_life_satisfaction_5a|", "sleep_health_of_adults|", "household_exposure_to_secondhand_smoke_current|", 
    "sleep_health_of_infants|", "caregiver_health_literacy|", "couples_satisfaction_index_4_item|", "infant_feeding_practices|", 
    "skin_tone_assessment|", "ethnic_self_identity|", "adverse_childhood_experiences|", "benevolent_childhood_experiences|"]};

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
        temp.splice(length - 1, 1);
        to_add = temp.join('');
    }
    else {
        to_add = 'none';
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