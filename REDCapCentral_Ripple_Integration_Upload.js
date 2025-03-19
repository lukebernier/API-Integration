const newman = require('newman'); // require newman in your project
const xl = require('xlsx');

//Get current date for file naming
date_string_fname = get_date_string(1);


var redcap_run = 1; // 1 = export global from ripple, 2 = export 0-5 month study from ripple, 3 = export 6-11 month study, 4 = export preconception, 5 = import participants aging into 6-11, 6 = export redcap, 7 = import 0-5 month study, 8 = import global, 9 = import 6-11 month study, 10 = import preconception
var ids_in_study = [];
var familyId_in_study = [];
var withdrawn_ids = [];
var partner_ids = [];
var partner_ids_family = [];
var prev_forms = [];
var prev_forms_6_11 = [];
var add_to_6_11 = [];
var ids_in_6_11 = [];
var ids_in_preconception = [];
var birthdays = [];
var status_preconception = [];

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
        // get withdrawn ids
        const content = data.response.stream.toString();
        const content_csv = csvJSON(content);
        const cn = JSON.parse(content_csv);

        for (let i = 0; i < cn.length; i++) {
            
            if (cn[i]["cv.eligibility_status"] == "Withdrawn") {
                withdrawn_ids.push(cn[i].globalId);
                //console.log('added to withdrawn: ', cn[i].globalId) // displays withdrawn participants
            }

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
        // The purpose of this is because ECHO keeps adding forms even though participants have completed their visit
        // I do not want the cv.forms_to_be_completed to be updated for participants who completed all of the surveys that were available to them

        // also get birthday and language so that we can add participants to 6-11 month study as they age in
        const content = data.response.stream.toString();
        const content_csv = csvJSON(content);
        const cn = JSON.parse(content_csv);
        
        var birthday_date = new Date();
        var today = new Date();
        var new_cutoff = new Date();
        var we_english;
        var we_spanish;

        for (let i = 0; i < cn.length; i++) {
            var birthday_date = new Date();
            var today = new Date();
            var new_cutoff = new Date();
            var we_english = '';
            var we_spanish = '';
            var customId;
            customId = cn[i].customId;

            if (cn[i]['cv.forms_to_be_completed'] == "None" ) { // get cv.forms_to_be_completed
                prev_forms.push(cn[i].globalId);
            }
            
            birthday_date = Date.parse(cn[i]['birthday']);
            birthdays.push([cn[i].globalId, birthday_date])

            new_cutoff = addDays(birthday_date, 365);

            elig_cutoff = Date.parse(cn[i]['cv.0_5_month_eligibility_cutoff']);

            if (cn[i]['cv.preferred_language'] == 'Spanish') {
                we_spanish = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            }
            else {
                we_english = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            }

            if (elig_cutoff < today) {
                add_to_6_11.push([cn[i].globalId, customId, new_cutoff, we_english, we_spanish]);
            }

        }

    }
    else if (redcap_run == 3){
        const content = data.response.stream.toString();
        const content_csv = csvJSON(content);
        const cn = JSON.parse(content_csv);

        for (let i = 0; i < cn.length; i++) {

            if (cn[i].tags == "Test participant" ) {
                delete cn[i];
            }
            else {
                ids_in_6_11.push(cn[i].globalId);
            }

            if (cn[i]['cv.forms_to_be_completed'] == "None" ) { // get cv.forms_to_be_completed
                prev_forms_6_11.push(cn[i].globalId);
            }
        }

        // Sets up file for import for participants who are aging in
        var first = true;
        const workbook_add = xl.utils.book_new();

        var aoa_6_11 = [];

        var headers_6_11 = ['globalId', 'customId', 'cv.6_11_month_eligibility_cutoff', 'cv.welcomeemail_english_', 
        'cv.welcomeemail_spanish_', 'importType'];

        aoa_6_11.push(headers_6_11);

        for (i = 0; i < add_to_6_11.length; i++) {

            /*
            if(withdrawn_ids.includes(add_to_6_11[i][0])) { // print out withdrawn participants
                console.log("WITHDRAWN FLAG - DO NOT ADD PARTICIPANT: ", add_to_6_11[i][0] )
            }
            */

            if ((!ids_in_6_11.includes(add_to_6_11[i][0])) && (!withdrawn_ids.includes(add_to_6_11[i][0]))) {
                if (first) {
                    aoa_6_11.push([add_to_6_11[i][0], add_to_6_11[i][1], add_to_6_11[i][2], add_to_6_11[i][3], add_to_6_11[i][4], '']); //TODO: Add 6-11 month study import code 
                    first = false;
                }
                else {
                    aoa_6_11.push([add_to_6_11[i][0], add_to_6_11[i][1], add_to_6_11[i][2], add_to_6_11[i][3], add_to_6_11[i][4]]);
                }

            }

        }

        const aoa_6_11_study = xl.utils.aoa_to_sheet(aoa_6_11, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});


        xl.utils.book_append_sheet(workbook_add, aoa_6_11_study, "data");


        var newFileName_add = "Log Files/log_" + date_string_fname + "_6_11_add" + ".xlsx";


        //Save one version as a way to look at what happened for every run
        xl.writeFile(workbook_add, newFileName_add, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});


        //Save another version for the actual import - I cannot edit the .json file to update the file path so
        // every time time this runs it needs to have the same name for the excel file import
        xl.writeFile(workbook_add, "Upload Files/upload_6_11_add.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});


    }
    else if (redcap_run == 4) {
        // get ids and statuses from preconception study
        const content = data.response.stream.toString();
        const content_csv = csvJSON(content);
        const cn = JSON.parse(content_csv);
        

        for (let i = 0; i < cn.length; i++) {
            ids_in_preconception.push(cn[i].globalId);
            status_preconception.push([cn[i].globalId, cn[i].statusId]);
        }
        //console.log(ids_in_preconception)

    }
    else if (redcap_run == 6) {
        // get data from REDCap Central
        const content = data.response.stream.toString();
        const contentJSON = JSON.parse(content);

        
        const workbook_0_5 = xl.utils.book_new();
        const workbook_global = xl.utils.book_new();
        const workbook_6_11 = xl.utils.book_new();
        const workbook_preconception = xl.utils.book_new();


        //0-5 import file creation
        var aoa_0_5 = [];
        var headers_0_5 = ['globalId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
        'cv.addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
        'cv.forms_to_be_completed', 'cv.pi_con_completed', 'importType'];

        aoa_0_5.push(headers_0_5);

        //global import file creation
        var aoa_global = [];

        var headers_global = ['globalId', 'familyId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
        'cv.addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
        'importType'];

        aoa_global.push(headers_global);

        //6-11 import file creation
        var aoa_6_11 = [];

        var headers_6_11 = ['globalId', 'cv.dem_b_complete', 'cv.dem_c_complete', 'cv.dem_cg_complete', 
        'cv.addr_hx_complete', 'cv.medical_history_of_the_child_complete', 'cv.medical_history_of_the_biological_family_complete', 
        'cv.forms_to_be_completed', 'importType'];

        aoa_6_11.push(headers_6_11);

        //preconception import file creation
        var aoa_preconception = [];

        var headers_preconception = ['globalId', 'statusId', 'cv.eligible_partner', 'cv.visit_window_start', 
        'cv.visit_window_end', 'cv.forms_to_be_completed', 'importType'];

        aoa_preconception.push(headers_preconception);

        //define vars
        var temp_study_mom = [];
        var temp_study_child = [];
        var temp_study_child_6_11 = [];
        var temp_preconception = [];
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
        var first_row_child_6_11 = true;
        var first_row_preconception = true;
        var first_row_mom = true;
        var duplicates_mom = [];
        var duplicates_child = [];
        var pi_con;

        
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
            /*********************************************************
             *              0-5 MONTH AND GLOBAL FILE CREATION
             * *******************************************************/
            if (contentJSON[i].redcap_event_name == 'a05mos_arm_1') {  // change to a05mos_arm_1
                forms = [contentJSON[i].prg_subuse_r_complete, contentJSON[i].prg_msuppsfbf_complete, contentJSON[i].cnp_prams_complete, 
                    contentJSON[i].cnp_weds_complete, contentJSON[i].cnp_pdep_cat_complete, contentJSON[i].cnp_panx_cat_complete, 
                    contentJSON[i].cnp_ntpss10_complete, contentJSON[i].cnp_pes_cat_complete, contentJSON[i].cnp_pinfs_cat_complete, 
                    contentJSON[i].cnp_pinstrs_cat_complete, contentJSON[i].cgw_pgls_cat_complete, contentJSON[i].cgw_sha_complete, 
                    contentJSON[i].bpe_heshs_c_complete, contentJSON[i].chb_shinf_complete, contentJSON[i].hhx_chl_complete, 
                    contentJSON[i].hse_csi4_complete, contentJSON[i].chb_ifp_complete, contentJSON[i].dem_sta_complete,
                    contentJSON[i].dem_rei_complete, contentJSON[i].cnp_ace_complete, contentJSON[i].cnp_bce_complete];
                    
                d = get_date_string(0);

                if (contentJSON[i].adm_pi_con_complete == 2){pi_con = 'yes';}else{pi_con = '';}
                if (contentJSON[i].dem_dem_b_complete == 2 || dem_b == 'yes'){dem_b = 'yes';}else{dem_b = 'no';}
                if (contentJSON[i].dem_dem_c_complete == 2 || dem_c == 'yes'){dem_c = 'yes';}else{dem_c = 'no';}
                if (contentJSON[i].dem_dem_cg_complete == 2 || dem_cg == 'yes'){dem_cg = 'yes';}else{dem_cg = 'no';}
                if (contentJSON[i].dem_addr_complete == 2 || dem_addr == 'yes'){dem_addr = 'yes';}else{dem_addr = 'no';}
                if (contentJSON[i].hhx_mh2_f_complete == 2 || mhb == 'yes'){mhb = 'yes';}else{mhb = 'no';}
                if (contentJSON[i].hhx_mh2_c_complete == 2 || mhc == 'yes'){mhc = 'yes';}else{mhc = 'no';}



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
                        dem_cg, dem_addr, mhc, mhb, '']; //TODO: Add import code 'global'
                            
                       

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

                    aoa_0_5.push(temp_study_child);
                    
                }
            }
            /*********************************************************
             *              6-11 MONTH VISIT FILE CREATION
             * *******************************************************/
            if (contentJSON[i].redcap_event_name == 'a611mos_arm_1') {

                var asq;
                if (contentJSON[i].cnh_asq_2_complete == 2 || contentJSON[i].cnh_asq_4_complete == 2 || contentJSON[i].cnh_asq_6_complete == 2 || 
                    contentJSON[i].cnh_asq_8_complete == 2 || contentJSON[i].cnh_asq_10_complete == 2 || contentJSON[i].cnh_asq_12_complete == 2) {
                        asq = '2';
                    }
                forms = [contentJSON[i].dem_occ_cg_complete, contentJSON[i].dem_ece_complete, contentJSON[i].dem_rei_complete, 
                    contentJSON[i].dem_sta_complete, contentJSON[i].hhx_cbi_complete, contentJSON[i].hhx_hic_complete, 
                    contentJSON[i].hhx_wt_cg_complete, contentJSON[i].prg_pi_complete, contentJSON[i].prg_pmci2_complete, 
                    contentJSON[i].prg_mfsp_complete, contentJSON[i].prg_dsq_sr_complete, contentJSON[i].cnp_prams_complete, 
                    contentJSON[i].cnp_ace_complete, contentJSON[i].cnp_bce_complete, contentJSON[i].cgw_pgh_complete, 
                    contentJSON[i].dem_iafs_c_complete, contentJSON[i].cph_air_inf_complete, contentJSON[i].chb_ifp_complete,
                    contentJSON[i].chb_shinf_complete, contentJSON[i].hse_life_c_complete, asq, contentJSON[i].cnh_ribqrvsf_complete];


                if (contentJSON[i].dem_dem_b_complete == 2 || dem_b == 'yes'){dem_b = 'yes';}else{dem_b = 'no';}
                if (contentJSON[i].dem_dem_c_complete == 2 || dem_c == 'yes'){dem_c = 'yes';}else{dem_c = 'no';}
                if (contentJSON[i].dem_dem_cg_complete == 2 || dem_cg == 'yes'){dem_cg = 'yes';}else{dem_cg = 'no';}
                if (contentJSON[i].dem_addr_complete == 2 || dem_addr == 'yes'){dem_addr = 'yes';}else{dem_addr = 'no';}
                if (contentJSON[i].hhx_mh2_f_complete == 2 || mhb == 'yes'){mhb = 'yes';}else{mhb = 'no';}
                if (contentJSON[i].hhx_mh2_c_complete == 2 || mhc == 'yes'){mhc = 'yes';}else{mhc = 'no';}
                
                if (ids_in_6_11.includes(contentJSON[i].record_id)) {
                    if (first_row_child_6_11) {
                            
                        temp_study_child_6_11 =  [contentJSON[i].record_id, dem_b, dem_c, 
                        dem_cg, dem_addr, mhc, mhb, get_forms_tbc_6_11(forms), '']; //TODO: Add 6-11 month study import code 
                        first_row_child_6_11 = false;
                    }
                    else {
                        
                        temp_study_child_6_11 = [contentJSON[i].record_id, dem_b, dem_c, 
                        dem_cg, dem_addr, mhc, mhb, get_forms_tbc_6_11(forms)];
                    }

                    if (prev_forms_6_11.includes(contentJSON[i].record_id)) {
                        temp_study_child_6_11[7] = 'none';
                    }

                    aoa_6_11.push(temp_study_child_6_11);
                }
            }
            /*********************************************************
             *              PRECONCEPTION FILE CREATION
             * *******************************************************/
            
            if (contentJSON[i].redcap_event_name == 'a611mosp_arm_1b') { 

                forms = [contentJSON[i].dem_rei_complete, contentJSON[i].dem_sta_complete, contentJSON[i].cnp_ace_complete, 
                    contentJSON[i].cnp_bce_complete, contentJSON[i].cnp_weds_complete, contentJSON[i].cnp_pdep_cat_complete,
                    contentJSON[i].cnp_panx_cat_complete, contentJSON[i].hse_life_c_complete, contentJSON[i].prt_dem_p_complete, 
                    contentJSON[i].prt_htwt_p_complete, contentJSON[i].prt_mh2_p_complete, contentJSON[i].prt_supp_p_complete,
                    contentJSON[i].prt_pi_p_complete, contentJSON[i].prt_occ_cg_p_complete];
                
                
                var status;
                var vis_win_start;
                var vis_win_end;
                var cutoff;

                var shared_id = contentJSON[i].record_id;
                var arr = shared_id.split('');
                arr_length = arr.length;

                arr[length-1] = 'A';
 
                shared_id = arr.join('');

                for (j = 0; j < birthdays.length; j++) {
                    if (birthdays[j][0] == shared_id) {
                        cutoff = birthdays[j][1];
                        vis_win_start = addDays(cutoff, 183);
                        vis_win_end = addDays(cutoff, 365);
                        break;
                    }
                    else {
                        cutoff = '';
                        vis_win_start = '';
                        vis_win_end = '';
                    }
                }



                for (j = 0; j < status_preconception.length; j++) {

                    if (status_preconception[j][0] == contentJSON[i].record_id) {
                        status = status_preconception[j][1];

                        break;
                    }
                    else {
                        status = '';
                    }
                }

                status = get_precon_status(status);

                if (contentJSON[i].p_scrn_1 == '2') {
                    status = 'not_eligible';
                }

 
                var cur_partner = '';
                if (contentJSON[i].p_scrn_1 == '1') {
                    cur_partner = 'yes';
                }
                else if (contentJSON[i].p_scrn_1 == '2'){
                    cur_partner = 'no';
                }
                else {
                    cur_partner = '';
                }

                

                if ((ids_in_preconception.includes(contentJSON[i].record_id)) && (status != '')) {
                    if (first_row_preconception) {
                            
                        temp_preconception =  [contentJSON[i].record_id, status, cur_partner, vis_win_start, vis_win_end, 
                        get_forms_tbc_precon(forms), '']; //TODO: Add preconception study import code 
                        first_row_preconception = false;
                    }
                    else {
                        
                        temp_preconception = [contentJSON[i].record_id, status, cur_partner, vis_win_start, vis_win_end, 
                        get_forms_tbc_precon(forms)];
                    }

                    aoa_preconception.push(temp_preconception);
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
        
        const aoa_sheet_0_5 = xl.utils.aoa_to_sheet(aoa_0_5, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
        const aoa_sheet_global = xl.utils.aoa_to_sheet(aoa_global, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
        const aoa_sheet_6_11 = xl.utils.aoa_to_sheet(aoa_6_11, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});
        const aoa_sheet_preconception = xl.utils.aoa_to_sheet(aoa_preconception, {raw:false,dateNF:'mm/dd/yyyy',cellDates:true});


        xl.utils.book_append_sheet(workbook_0_5, aoa_sheet_0_5, "data");
        xl.utils.book_append_sheet(workbook_global, aoa_sheet_global, "data");
        xl.utils.book_append_sheet(workbook_6_11, aoa_sheet_6_11, "data");
        xl.utils.book_append_sheet(workbook_preconception, aoa_sheet_preconception, "data");



        var newFileName_0_5 = "Log Files/log_" + date_string_fname + "_0_5" + ".xlsx";
        var newFileName_global = "Log Files/log_" + date_string_fname + "_global" + ".xlsx";
        var newFileName_6_11 = "Log Files/log_" + date_string_fname + "_6_11" + ".xlsx";
        var newFileName_preconception = "Log Files/log_" + date_string_fname + "_preconception" + ".xlsx";



        //Save one version as a way to look at what happened for every run
        xl.writeFile(workbook_0_5, newFileName_0_5, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_global, newFileName_global, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_6_11, newFileName_6_11, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_preconception, newFileName_preconception, {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});



        //Save another version for the actual import - I cannot edit the .json file to update the file path so
        // every time time this runs it needs to have the same name for the excel file import
        xl.writeFile(workbook_0_5, "Upload Files/upload_0_5.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_global, "Upload Files/upload_global.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_6_11, "Upload Files/upload_6_11.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});
        xl.writeFile(workbook_preconception, "Upload Files/upload_preconception.xlsx", {raw:false, cellDates: true,dateNF:'mm/dd/yyyy'});


    
        
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
  
    //return result; //JavaScript object
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

function get_forms_tbc_6_11(forms) { 


    keys = {"key":["caregiver_occupation_and_employment|", "early_care_and_education|", "ethnic_self_identity|", "skin_tone_assessment|", 
    "child_birth_information|", "health_insurance_coverage|", "caregiver_weight|", "pregnancy_intentions|", 
    "pregnancy_medical_conditions_and_interventions|", "maternal_food_source_and_preparation|", "dietary_screener_questionnaire|",
    "stressful_life_events_in_pregnancy|", "adverse_childhood_experiences|", "benevolent_childhood_experiences|", 
    "caregiver_global_health|", "income_assistance_and_finances_childhood|", "airways_questionnaire|", "infant_feeding_practices|", 
    "sleep_health_of_infants|", "caregiver_substance_use_current_lifestyle|", "ages_and_stages_questionnaire|", "child_behavior|"]};


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

function get_forms_tbc_precon(forms) { 

    keys = {"key":["racial_ethnic_identity|", "skin_tone_assessment|", "adverse_childhood_experiences|", 
    "benevolent_childhood_experiences|", "the_everyday_discrimination_scale|", "promis_depression_8a|", "promis_anxiety_8a|", 
    "caregiver_substance_use_lifestyle_current|", "demographics_of_the_partner|", "partner_weight_and_height|", 
    "medical_history_of_the_partner|", "supplements_partner|", "pregnancy_intentions|", "caregiver_occupation_and_employment|"]};


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

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

function get_precon_status(status) {

    var new_status = '';
    if (status == 'Interested - consent pending') {new_status = 'interested_consent_pending';}
    else if (status == 'Consented') {new_status = 'consented';}
    else if (status == 'Not Interested') {new_status = 'not_interested';}
    else if (status == 'Withdrawn') {new_status = 'withdrawn';}
    else if (status == 'Biospecimens needed - Susana') {new_status = 'biospecimens_needed_susana';}
    else if (status == 'Biospecimens needed - Yoselin') {new_status = 'biospecimens_needed_yoselin';}
    else if (status == 'Biospecimen kit shipped - Susana') {new_status = 'biospecimen_kit_shipped_susana';}
    else if (status == 'Biospecimen kit shipped - Yoselin') {new_status = 'biospecimen_kit_shipped_yoselin';}
    else if (status == 'Survey only participants') {new_status = 'survey_only_participants';}
    else if (status == 'Visit Complete') {new_status = 'visit_complete';}
    else if (status == 'Not eligible') {new_status = 'not_eligible';}

    return new_status;

}