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

function isValidSubproj(string) {
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
function companyEval() {
    if (isValidCompany(companyList, $("#company").val())) {
        $("#project").removeAttr("disabled");
        $("#project").css("background-color", "white")
    } else {
        $("#project").attr("disabled", true);
        $("#project").css("background-color", "transparent")
    }
}


function projectEval() {
    if ($("#project").val().length > 0) {
        $("#company").attr("disabled", true);
        $("#company").css("background-color", '#eee');
    } else {
        $("#company").removeAttr("disabled");
        $("#company").css("background-color", 'white');
    }
    if (isValidProject(projectList, $("#project").val())) {
        $("#subproject").removeAttr("disabled");
        console.log('worked')
    } else {
        $("#subproject").attr("disabled", true);
    }
}

function subprojEval() {
        if ($("#subproject").val() > 0) {
            $("#project").attr("disabled", true);
            $("#project").css("background-color", '#eee');
        } else {
            $("#project").removeAttr("disabled");
            $("#project").css("background-color", 'white');
        }
        if (isValidSubproj($("#subproject").val())) {
            $("button#confirm").removeAttr("disabled");
        } else {
            $("button#confirm").attr("disabled", true);
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
    var url = 'dstatus/api/clients/'
    url = url + (companyIndex).toString();
    url = url + '/projects'
    return $.ajax({
        url: url,
        success: function(data){
            var projs = data.projects;
            projs = _.map(projs, function(obj,ind){return {val:obj.name}});
            projects.clear();
            projects.add(projs);
            projectList = _.map(projs, function(obj,ind){return obj.val});
        }
    });
}

function fetchSubprojects(companyIndex, projectIndex) {
    var url = '/dstatus/api/clients/';
    var $subproj = $('select#subproject');
    url = url + (companyIndex).toString();
    url = url + '/projects/';
    url = url + (projectIndex).toString();
    url = url + '/subprojects';
    $subproj.empty();
    $subproj.append('<option value="0">Select Project Phase</option>');
    function insertSubproj (elem, ind, lst){
        var insertion = '<option value="';
        insertion = insertion + (ind+1).toString() + '">';
        insertion = insertion + elem + '</option>';
        $subproj.append(insertion);
        return insertion
    }
    return $.ajax({
        url: url,
        success: function(data){
            var subprojs = data.subprojects;
            var subprojNames = _.map(subprojs, function(elem, ind, lst) {
                return elem.name
            });
            _.each(subprojNames, insertSubproj);
            subprojList = _.map(subprojs, function(obj,ind){return obj.val});
        }
    });
}



// files api
isGoodSize = function(fileSize) {return fileSize < 5000000000};


BigFile = function(file){
    var bf;
    bf = {};
    bf.name = file.name;
    bf.targetSize = file.size;
    bf.file = file;

    bf.isUploaded = function() {
        return (bf.serverSize === bf.targetSize)
    }

    bf.isNotAllowed = function() {
        return (bf.error === "405: filetype not allowed")
    }

    bf.send = function(){
        var currentFile = files.currentFile
        var changeStatus = function(oldClass, newClass) {
            files.fileTableRows().eq(currentFile).removeClass(oldClass);
            files.fileTableRows().eq(currentFile).addClass(newClass);
        }
        if (bf.isUploaded()) {
            changeStatus('danger', 'success');
            files.sendNext();
        } else if (bf.isNotAllowed()) {
            files.sendNext();
        } else {
            changeStatus('danger', 'warning');
            var fd;
            fd = new FormData();
            fd.append('company', $('input#company').val());
            fd.append('project', $('input#project').val());
            fd.append('subproject', $('select#subproject option:selected').text());
            fd.append('file', bf.file);
            fd.append('extension', bf.name.split('.')[1]);
            $.ajax({
                url: '/send_file',
                type: 'POST',
                dataType: 'json',
                data: fd,
                cache: false,
                contentType: false,
                processData: false,
            }).success(function(r){
                console.log(r);
                changeStatus('warning', 'success');
                files.sendNext();
            });
        }
    }

    bf.queryServerSide = function() {
        var fd;
        fd = new FormData();
        fd.append('company', $('input#company').val());
        fd.append('project', $('input#project').val());
        fd.append('subproject', $('select#subproject option:selected').text());
        fd.append('file', bf.name)
        $.ajax({
            url: '/getfilesize',
            type: 'POST',
            dataType: 'json',
            data: fd,
            cache: false,
            contentType: false,
            processData: false
        }).success(function(r){
            console.log(r);
            var divsTo;
            bf.serverSize = r.server_size;
            if (r.error){
                bf.error = r.error;
            }
            displayedFiles = $('table.table tbody').children();
            _.each(files.uploadObjs, function(elem, ind){
                displayedFiles.eq(ind).removeClass('danger');
                displayedFiles.eq(ind).removeClass('success');
                displayedFiles.eq(ind).removeClass('warning');
            });
        }).error(function(e) {
            console.log(e);
        });
    };
    bf.queryServerSide();

    return bf
};


files = (function($, _) {
    var f, registerUpChunk, inFiles, presentation, fileCount;
    f = {};
    // register a file as an upchunk object
    registerFiles = function() {
        f.registeredFiles = _.map(f.list(), function(elem){return BigFile(elem)});
    }

    f.sendNext = function() {
        if (fileCount > 0 && typeof(fileCount) === typeof(0)) {
            fileCount = fileCount - 1;
            f.currentFile = f.currentFile + 1;
            f.registeredFiles[f.currentFile].send();
        }
    }

    inFiles = $("input#fileinput");
    presentation = $('table#fileList tbody.files');
    assistTable = $('table#assistList tbody');
    f.list = function(){
        return inFiles.get(0).files;
    };
    f.display = function(){
        addFileRow = function(elem, index, list) {
            var name, type, size;
            name = elem.name;
            type = elem.type;
            size = isGoodSize(elem.size) ? (elem.size/1000000).toFixed(2) + ' MB' : 'Too big.'
            if (type.slice(0,5) === 'video') {
                presentation.append('<tr><td>'+name+'</td><td>'+type+'</td><td>'+size+'</td></tr>')
            } else {
                presentation.append('<tr class="danger"><td>'+name+'</td><td>'+type+'</td><td>'+size+'</td></tr>')
            }
        };
        presentation.empty();
        fileCount = f.list().length;
        f.currentFile = -1;
        registerFiles();
        _.each(f.list(), addFileRow);
        if (f.list().length > 0) {
            $("#upload-btn").removeAttr("disabled");
            $('table#fileList').css('visibility', 'visible');
        } else {
            $("#upload-btn").attr("disabled", true);
            $('table#fileList').css('visibility', 'hidden');
        }
    }
    f.pres = $("table#filepres tbody.files");
    f.fileTableRows = function(){return $("table#fileList tbody tr")};

    return f;
}(jQuery, _));



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


    //input change rules:
    $("#company").on('input', function() {
        companyEval();
    });
    $("#project").on('input', function() {
        projectEval();
    });
    $("#subproject").change(function() {
        console.log('test');
        subprojEval();
    });
    $("#fileinput").change(function(){
        files.display();
        if (files.list().length > 0){
            $('button#upload-btn').removeAttr('disabled');
        }
    });

    $("#files").change(function() {
        //fileEval();
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

    $("button#confirm").click(function(e){
        e.preventDefault();
        $('select#subproject').attr('disabled', true);
        $('button#confirm').attr('disabled', true);
        $('input#fileinput').removeAttr('disabled');
        $('span#add-files').removeAttr('disabled');
        //change text color
        $('h2.text-center').eq(0).css('color', '#eee');
        $('h2.text-center').eq(1).css('color', 'rgb(51,51,51)');
    });

    $("button#upload-btn").click(function(e){
        e.preventDefault();
        files.sendNext();
    });


});
