//validity testing
function isValidCompany(companies, string) {
    var returnVal;
    if (companies.indexOf(string) >= 0) {
        returnVal = true;
    } else {
        returnVal = false;
    }
    return returnVal;
}

function isValidProject(projects, string) {
    var returnVal;
    if (projects.indexOf(string) >= 0) {
        returnVal = true;
    } else {
        returnVal = false;
    }
    console.log(returnVal);
    return returnVal;
}

function isValidPhase(string) {
    var count = parseInt(string);
    var returnVal;
    if (count > 0) {
        returnVal = true;
    } else {
        returnVal = false;
    }

    return returnVal;
}

function isValidFile(string) {
    var re = /(mp4|mov|m4v)$/;
    return re.test(string);
}

//test validity with the following
function companyEval(){
    if (isValidCompany(companyList, $("#company").val())) {
        $("#project").removeAttr("disabled");
        $("#project").css("background-color", "white")
    } else {
        $("#project").attr("disabled", true);
        $("#project").css("background-color", "transparent")
    }
}


function projectEval(){
    if ($("#project").val().length > 0) {
        $("#company").attr("disabled", true);
    } else {
        $("#company").removeAttr("disabled");
    }
    if (isValidProject(projectList, $("#project").val())) {
        $("#phase").removeAttr("disabled");
        console.log('worked')
    } else {
        $("#phase").attr("disabled", true);
    }
}

//typeahead event handlers
function onSelectedCompany($e, datum) {
    console.log('selected');
    console.log(datum);
    companyEval();

    var company = $("#company").val();
    if (isValidCompany(companyList, company)) {
        var companyIndex = companyList.indexOf(company)+1
        fetchProjects(companyIndex);
    }
}

function onSelectedProject($e, datum) {
    console.log('selected');
    console.log(datum);
    projectEval();

    var company = $("#company").val();
    var project = $("#project").val();
    if (isValidCompany(companyList, company)) {
        var companyIndex = companyList.indexOf(company)+1
        var projectIndex = projectList.indexOf(project)+1
        fetchSubprojects(companyIndex, projectIndex);
    }
}


function fetchCompanies() {
    return $.ajax({
        url: '/dstatus/api/clients',
        success: function(data){
            var clients = data.clients;
            clients = $.map(clients, function(obj,ind){return {val:obj.name}});
            companies.clear();
            companies.add(clients);
            companyList = $.map(clients, function(obj,ind){return obj.val});
        }
    });
}

function fetchProjects(companyIndex) {
    return $.ajax({
        url: '/dstatus/api/clients/' + (companyIndex).toString() + '/projects',
        success: function(data){
            var projs = data.projects;
            projs = $.map(projs, function(obj,ind){return {val:obj.name}});
            projects.clear();
            projects.add(projs);
            projectList = $.map(projs, function(obj,ind){return obj.val});
        }
    });
}

function fetchSubprojects(companyIndex, projectIndex) {
    var url = '/dstatus/api/clients/';
    url = url + (companyIndex).toString();
    url = url + '/projects/';
    url = url + (projectIndex).toString();
    url = url + '/subprojects'
    return $.ajax({
        url: url,
        success: function(data){
            var subprojs = data.subprojects;
            subprojs = $.map(subprojs, function(obj,ind){return {val:obj.name}});
            subprojList = $.map(subprojs, function(obj,ind){return obj.val});
        }
    });
}


$(document).ready(function(){

    //twitter typeahead setup
    var companyList = [];
    var projectList = [];
    var subprojList = [];

    companies = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('val'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: $.map(companyList, function(company) { return { val: company }; })
    });
    companies.initialize();

    projects = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('val'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: $.map(projectList, function(project) { return { val: project }; })
    });
    projects.initialize();

    fetchCompanies();

    //attaching typeahead to the DOM
    $('#bhCompany .typeahead').typeahead({
        hint: true,
        highlight: true,
        minLength: 1
    },
    {
        name: 'companies',
        displayKey: 'val',
        source: companies.ttAdapter()
    }).on('typeahead:selected', onSelectedCompany);

    $('#bhProject .typeahead').typeahead({
        hint: true,
        highlight: true,
        minLength: 1
    },
    {
        name: 'projects',
        displayKey: 'val',
        source: projects.ttAdapter()
    }).on('typeahead:selected', onSelectedProject);


    // company input change rules:
    $("#company").on("input", function() {
        companyEval();
    });
    // project input change rules:
    $("#project").on("input", function() {
        projectEval();
    });

    // phase input change rules:
    $("#phase").on("change", function() {
        if ($("#phase").val() > 0) {
            $("#project").attr("disabled", true);
        } else {
            $("#project").removeAttr("disabled");
        }

        if (isValidPhase($("#phase").val())) {
            $("#files").removeAttr("disabled");
        } else {
            $("#files").attr("disabled", true);
        }
    });

    // file change rules:
    $("#files").change(function() {
        $("#fileDisp").empty();
        if ($("#files")[0].files.length > 0) {
            $("#submit").removeAttr("disabled");
        } else {
            $("#submit").attr("disabled", true);
        }
        _.each($("#files")[0].files, function(file) {
            $("#fileDisp").append('<span class="list-group-item list-group-item-success">'+ file.name + '</span>')
        });
    });

});
