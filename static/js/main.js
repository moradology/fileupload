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
    } else {
        $("#company").removeAttr("disabled");
    }
    if (isValidProject(projectList, $("#project").val())) {
        $("#subproject").removeAttr("disabled");
        console.log('worked')
    } else {
        $("#subproject").attr("disabled", true);
    }
}

function subprojEval() {
        console.log('subprojeval');
        if ($("#subproject").val() > 0) {
            $("#project").attr("disabled", true);
        } else {
            $("#project").removeAttr("disabled");
        }
        if (isValidSubproj($("#subproject").val())) {
            $("#files").removeAttr("disabled");
        } else {
            $("#files").attr("disabled", true);
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

tst = function() {
        formDataA = new FormData();
        formDataA.append('company', $('input#company').val());
        formDataA.append('project', $('input#project').val());
        formDataA.append('subproject', $('select#subproject option:selected').text());
        formDataA.append('file', files.list()[0].name);
        $.ajax({
            url: '/getfilesize',
            type: 'GET',
            dataType: 'json',
            data: formDataA,
            cache: false,
            contentType: false,
            processData: false
        })
    }


BigFile = function(file){
    var bf, f;
    bf = {};
    bf.name = file.name;
    bf.targetSize = file.size;

    f = new FileReader();
    f.onload = function(e) {
        var mimeString, byteString, divsTo;
        mimeString = f.result .split(',')[0].split(':')[1].split(';')[0];
        byteString = f.result.split(',')[1];

        divsTo = parseInt(byteString.length/100000);
        bf.clientChunkCount = byteString%100000 === 0 ? divsTo : divsTo + 1;
        bf.mime = mimeString;
        bf.bytes = byteString;
        bf.byteLen = byteString.length;
        bf.queryServerSide();
    };

    f.readAsDataURL(file);


    bf.getChunk = function(chunkNum) {

        byteStart = (chunkNum-1)*100000
        return bf.bytes.slice(byteStart, byteStart+100000)
    }

    function nextChunkOrNot(serverSize, localSize) {
        if (serverSize > localSize) {
            return
        } else if (serverSize === localSize) {
            return finishTransmission()
        } else if (serverSize === null){
            return
        } else {
            return nextChunk(serverSize)
        }
    }

    function nextChunk(serverSize){
        var chunksDone;
        chunksDone = serverSize/100000;
        return sendChunk(chunksDone+1);
    }

    function finishTransmission() {
        var fd;
        fd = new FormData();
        fd.append('company', $('input#company').val());
        fd.append('project', $('input#project').val());
        fd.append('subproject', $('select#subproject option:selected').text());
        fd.append('file', bf.name);
        fd.append('extension', bf.name.split('.')[1]);
        $.ajax({
            url: '/finish_send',
            type: 'POST',
            dataType: 'json',
            data: fd,
            cache: false,
            contentType: false,
            processData: false,
        }).success(function(r){
            bf.status = r.status;
            files.display();
            files.registerNext();
        });
    }

    bf.sendFile = function(){
        if (bf.status === 'in progress') {
            return sendChunk(1)
        } else {
            files.registerNext();
        }
    }

    function sendChunk(whichChunk) {
        var fd;
        fd = new FormData();
        fd.append('company', $('input#company').val());
        fd.append('project', $('input#project').val());
        fd.append('subproject', $('select#subproject option:selected').text());
        fd.append('file', bf.name);
        fd.append('data', bf.getChunk(whichChunk));
        fd.append('extension', bf.name.split('.')[1]);
        fd.append('intent', whichChunk);
        $.ajax({
            url: '/chunked_send',
            type: 'POST',
            dataType: 'json',
            data: fd,
            cache: false,
            contentType: false,
            processData: false,
        }).success(function(r){
            nextChunkOrNot(r.serverSize, bf.byteLen);
            console.log(r);
        })
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
            var divsTo;
            bf.serverSize = r.server_size;
            divsTo = parseInt(bf.serverSize/1000);
            bf.serverChunkCount = file.size%1000 === 0 ? divsTo : divsTo + 1;
            bf.status = r.status;
            if (r.error){
                bf.error = r.error;
            }
            displayedFiles = $('table.table tbody').children();
            _.each(files.uploadObjs, function(elem, ind){
                displayedFiles.eq(ind).removeClass('danger');
                displayedFiles.eq(ind).removeClass('success');
                displayedFiles.eq(ind).removeClass('warn');
                switch(elem.status){
                    case 'error':
                        displayedFiles.eq(ind).addClass('danger');
                    case 'uploaded':
                        displayedFiles.eq(ind).addClass('success');
                    case 'in progress':
                        displayedFiles.eq(ind).addClass('warn');
                }
            });
        }).error(function(e) {
            console.log(e);
        });
    };

    return bf
};


files = (function($, _) {
    var f, registerUpChunk, inFiles, presentation, fileCount, currentFile;
    f = {};
    // register a file as an upchunk object
    registerFile = function(ind) {
        f.registeredFile = BigFile(f.list()[ind])
    }

    f.registerNext = function() {
        if (fileCount > 0) {
            registerFile(currentFile);
            currentFile += 1;
            fileCount -= 1;
        }
    }

    inFiles = $("input#fileinput");
    presentation = $('table tbody.files')
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
        currentFile = 0;
        f.registerNext();
        _.each(f.list(), addFileRow);
        if (f.list().length > 1) {
            $("#upload-btn").removeAttr("disabled");
        } else {
            $("#upload-btn").attr("disabled", true);
        }
    }
    f.pres = $("table#filepres tbody.files");

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
        subprojEval();
    });
    $("#fileinput").change(function(){files.display()});

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

    $("button#upload-btn").click(function(e){
        e.preventDefault()

        var formData = new FormData();
        formData.append('company', $('input#company').val())
        formData.append('project', $('input#project').val())
        formData.append('subproject', $('select#subproject option:selected').text())
        _.each($('input#fileinput').get(0).files, function(file, i){
            if (isGoodSize(file.size)) {
                formData.append('file-'+i, file);
            } else {
                console.log("file too large");
            }
        });

        $.ajax({
            url: '/sendfiles',
            type: 'POST',
            dataType: 'json',
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });
    });

});
