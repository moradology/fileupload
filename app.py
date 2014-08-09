#!/usr/bin/env python
"""
DOCSTRING FOR MODULE
"""

from flask import Flask, jsonify, abort, request, make_response, url_for
from flask import render_template
from flask.views import MethodView
from flask.ext.restful import Api, Resource, reqparse, fields, marshal
from flask.ext.httpauth import HTTPBasicAuth
from werkzeug.utils import secure_filename
from passlib.hash import sha256_crypt
import os
import base64

app = Flask(__name__, static_url_path = "")
api = Api(app)
auth = HTTPBasicAuth()


@auth.verify_password
def verify_password(username, password):
    name = 'dscience'
    passhash = '$5$rounds=110000$jOW224mvS2F4LU2n$jbOIGMNl6dcdcVtqsg.jRUZJt/CzQe0kQdllykKLnf1'
    if username != name:
        return False
    return sha256_crypt.verify(password, passhash)


@app.route('/')
@app.route('/index')
@auth.login_required
def index():
    """a"""
    return render_template("index.html")


VIDEO_ROOT = '/var/store/video/'
DOCUMENT_ROOT = '/var/store/docs/'
DOCUMENTS = ['txt', 'xls', 'xlsx', 'pdf', 'doc', 'docx', 'odt', 'ppt', 'pptx',\
        'csv']
PICTURES = ['jpg', 'svg', 'png', 'bmp', 'jpeg']
VIDEOS = ['mp4', 'mov', 'm4v', 'avi', 'wmv']
DATABASES = ['db']

ALLOWED_VIDEO = set(VIDEOS)
ALLOWED_DOCUMENTS = set(DOCUMENTS + PICTURES + DATABASES)
ALLOWED_EXTENSIONS = set(DOCUMENTS + PICTURES + VIDEOS + DATABASES)

def is_allowed(filename, criteria):
    """a"""
    return '.' in filename and \
            filename.rsplit('.', 1)[1] in criteria

@app.route('/check_credentials', methods=['POST'])
def check_credentials():
    password = request.form.get("password")
    passhash = '$5$rounds=110000$jOW224mvS2F4LU2n$jbOIGMNl6dcdcVtqsg.jRUZJt/CzQe0kQdllykKLnf1'
    if sha256_crypt.verify(password, passhash):
        status = "success"
    else:
        status = "failure"
    return jsonify({"status":status})


@app.route('/getfilesize', methods=['POST'])
@auth.login_required
def query_filesize():
    """Receive POST data containing a filename"""

    # video or docs
    if is_allowed(request.form.get('file'), ALLOWED_VIDEO):
        root = VIDEO_ROOT
    elif is_allowed(request.form.get('file'), ALLOWED_DOCUMENTS):
        root = DOCUMENT_ROOT
    else:
        return jsonify({'error': '405: filetype not allowed',\
                'status': 'error'})

    path = os.path.join(root, request.form.get('company'),\
            request.form.get('project'), request.form.get('subproject'),\
            request.form.get('file'))

    if os.path.isfile(path):
        current_size = os.stat(path).st_size
    else:
        current_size = 0

    return jsonify({"server_size":current_size})


@app.route('/chunked_send', methods=['POST'])
@auth.login_required
def chunked_transmission():
    """Receive POST of a portion of a file; handle data appropriately"""
    ajax = request.form
    data = ajax.get("data")

    ext = ajax.get("extension")
    if ext in ALLOWED_VIDEO:
        root = VIDEO_ROOT
    elif ext in ALLOWED_DOCUMENTS:
        root = DOCUMENT_ROOT
    else:
        return jsonify({'ERROR': '405: filetype not allowed'})

    path = os.path.join(root, request.form.get('company'),\
            request.form.get('project'), request.form.get('subproject'),\
            request.form.get('file')+'.part')

    chunk_count = int(ajax.get("intent"))

    if chunk_count > 1:
        with open(path, 'a') as f:
            f.write(data)
    else:
        with open(path, 'w') as f:
            f.write(data)

    if os.path.isfile(path):
        fileSize = os.stat(path).st_size
    else:
        fileSize = None

    return jsonify({"serverSize": fileSize, "intent": ajax.get('intent')})


@app.route('/finish_send', methods=['POST'])
@auth.login_required
def end_transmission():
    """End transmission and convert from base64 back to binary"""
    ajax = request.form

    ext = ajax.get("extension")
    if ext in ALLOWED_VIDEO:
        root = VIDEO_ROOT
    elif ext in ALLOWED_DOCUMENTS:
        root = DOCUMENT_ROOT
    else:
        return jsonify({'error': '400: filetype not allowed'})

    path = os.path.join(root, request.form.get('company'),\
            request.form.get('project'), request.form.get('subproject'),\
            request.form.get('file'))

    with open(path+'.part', 'r') as in_file:
        with open(path, 'w') as out_file:
            base64.decode(in_file, out_file)
    os.remove(path+'.part')

    return jsonify({"status": "uploaded"})


@app.route('/send_file', methods=['POST'])
@auth.login_required
def upload_file():
    """Receive POST data containing at least one file upload"""
    ajax = request.form
    sent_file = request.files.values()[0]

    if is_allowed(sent_file.filename, ALLOWED_VIDEO):
        print('to video')
        root = VIDEO_ROOT
    elif is_allowed(sent_file.filename, ALLOWED_DOCUMENTS):
        print('to docs')
        root = DOCUMENT_ROOT
    else:
        return jsonify({'error': '400: invalid filetype'})

    path = os.path.join(root, ajax.get('company'), ajax.get('project'),\
            ajax.get('subproject'), secure_filename(sent_file.filename))
    print path
    sent_file.save(path)

    return jsonify({'status': sent_file.filename + ' uploaded successfully.'})


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)


#@auth.error_handler
#def unauthorized():
#    """a"""
#    return make_response(jsonify({'message': 'Unauthorized access'}), 403)

FIELDS = dict(
    client_fields={
        'name': fields.String,
        'verified': fields.Boolean,
        'uri': fields.Url('client')
    },

    project_fields={
        'name': fields.String,
        'manager': fields.String,
        'verified': fields.Boolean,
        'uri': fields.Url('project')
    },

    subproject_fields={
        'name': fields.String,
        'verified': fields.Boolean,
        'uri': fields.Url('subproject')
    },

    participant_fields={
        'name': fields.String,
        'verified': fields.Boolean,
        'uri': fields.Url('participant')
    }
)

# simulate RDB data
def make_cli(client_names):
    new_list = []
    for ind, cli in enumerate(client_names):
        new_list.append({'name': cli, 'verified': False, 'cli_id': ind+1})
    return new_list

def make_proj(project_names, cli_id):
    new_list = []
    for ind, name in enumerate(project_names):
        new_list.append({'name': name, 'verified': False, 'cli_id': cli_id,\
            'proj_id': ind+1, 'manager': ''})
    return new_list

def make_subproj(subproject_names, cli_id, proj_id):
    new_list = []
    for ind, name in enumerate(subproject_names):
        new_list.append({'name': name, 'verified': False, 'cli_id': cli_id,\
            'proj_id': proj_id, 'subproj_id': ind+1})
    return new_list

def make_participant(participant_names, cli_id, proj_id, subproj_id):
    new_list = []
    for ind, name in enumerate(participant_names):
        new_list.append({'name': name, 'verified': False, 'cli_id': cli_id,\
            'proj_id': proj_id, 'subproj_id': subproj_id, 'participant_id':\
            ind+1})
    return new_list


# produce lists of data

def cli_list():
    path = '/var/store/video'
    folders = map(lambda x: path + '/' + x, os.listdir(path))
    folders = filter(os.path.isdir, folders)
    return list(map(os.path.basename, folders))


def project_list(client):
    """a"""
    path = '/var/store/video/{0}'.format(client)
    folders = map(lambda x: path + '/' + x, os.listdir(path))
    folders = filter(os.path.isdir, folders)
    return list(map(os.path.basename, folders))


def subproject_list(client, proj):
    path = '/var/store/video/{0}/{1}'.format(client, proj)
    folders = map(lambda x: path + '/' + x, os.listdir(path))
    folders = filter(os.path.isdir, folders)
    return list(map(os.path.basename, folders))


def participant_list(client, proj, subproj):
    path = '/var/store/video/{0}/{1}/{2}'.format(client, proj, subproj)
    files = map(lambda x: path + '/' + x, os.listdir(path))
    files = filter(os.path.isfile, folders)
    return list(map(os.path.basename, files))


client_list = cli_list()
clients = make_cli(client_list)

# CLIENT LEVEL
# list clients
class ClientListAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('name', type=str, required=True,\
                help='Client name required', location='json')
        super(ClientListAPI, self).__init__()

    def get(self):
        return {'clients': [marshal(x, FIELDS.get('client_fields'))\
                for x in clients]}


# specific client
class ClientAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('name', type=str, required=True,\
                help='Participant ID required', location='json')
        super(ClientAPI, self).__init__()

    def get(self, cli_id):
        # get client
        client = [x for x in clients if x.get('cli_id') == cli_id][0]

        if len(client) == 0:
            abort(404)
        return {'client': marshal(client, FIELDS.get('client_fields'))}


# PROJECT LEVEL
# list projects
class ProjectListAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('name', type=str, required=True,\
                help='Project code required', location='json')
        super(ProjectListAPI, self).__init__()

    def get(self, cli_id):
        # get client name
        clientname = [x for x in clients\
                if x.get('cli_id') == cli_id][0]['name']

        # get project
        projects = project_list(clientname)
        projects = make_proj(projects, cli_id)

        if len(projects) == 0:
            abort(404)
        return {'projects': [marshal(x, FIELDS.get('project_fields'))\
                for x in projects]}


# specific project
class ProjectAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('code', type=str, required=True,\
                help='Project code required', location='json')
        super(ProjectAPI, self).__init__()

    def get(self, cli_id, proj_id):
        # get client name
        clientname = [x for x in clients\
                if x.get('cli_id') == cli_id][0]['name']

        # get project
        projects = project_list(clientname)
        projects = make_proj(projects, cli_id)
        project = [x for x in projects if x.get('proj_id') == proj_id][0]

        if len(projects) == 0:
            abort(404)
        return {'project': marshal(project, FIELDS.get('project_fields'))}

# SUBPROJECT LEVEL
# list subprojects
class SubprojectListAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('code', type=str, required=True,\
                help='Project code required', location='json')
        super(SubprojectListAPI, self).__init__()

    def get(self, cli_id, proj_id):
        # get client name
        clientname = [x for x in clients\
                if x.get('cli_id') == cli_id][0]['name']

        # get project name
        projects = project_list(clientname)
        projects = make_proj(projects, cli_id)
        projectname = [x for x in projects\
                if x.get('proj_id') == proj_id][0].get('name')

        # need a list of subprojects; pipe list through makeSubproj func
        subprojects = subproject_list(clientname, projectname)
        subprojects = make_subproj(subprojects, cli_id, proj_id)

        if len(subprojects) == 0:
            abort(404)
        return {'subprojects': [marshal(x, FIELDS.get('subproject_fields'))\
                for x in subprojects]}


# specific project
class SubprojectAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('code', type=str, required=True,\
                help='Project code required', location='json')
        super(SubprojectAPI, self).__init__()

    def get(self, cli_id, proj_id, subproj_id):
        # get client name
        clientname = [x for x in clients\
                if x.get('cli_id') == cli_id][0]['name']

        # get project name
        projects = project_list(clientname)
        projects = make_proj(projects, cli_id)
        projectname = [x for x in projects\
                if x.get('proj_id') == proj_id][0].get('name')

        # need a list of subprojects; pipe list through makeSubproj func
        subprojects = subproject_list(clientname, projectname)
        subprojects = make_subproj(subprojects, cli_id, proj_id)
        subproject = [x for x in subprojects\
                if x.get('subproj_id') == subproj_id][0]

        if len(subprojects) == 0:
            abort(404)
        return {'subproject': marshal(subproject,\
                FIELDS.get('subproject_fields'))}


# PARTICIPANT LEVEL
# list participants
class ParticipantListAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('pID', type=str, required=True,\
                help='Participant ID required', location='json')
        super(ParticipantListAPI, self).__init__()

    def get(self, cli_id, proj_id, subproj_id):
        # get client name
        clientname = [x for x in clients\
                if x.get('cli_id') == cli_id][0]['name']

        # get project name
        projects = project_list(clientname)
        projects = make_proj(projects, cli_id)
        projectname = [x for x in projects\
                if x.get('proj_id') == proj_id][0].get('name')

        # need a list of subprojects; pipe list through makeSubproj func
        subprojects = subproject_list(clientname, projectname)
        subprojects = make_subproj(subprojects, cli_id, proj_id)
        subprojectname = [x for x in subprojects\
                if x.get('subproj_id') == subproj_id][0].get('name')

        # list of participants
        participants = participant_list(clientname, projectname, subprojectname)
        participants = make_participant(participants, cli_id, proj_id,\
                subproj_id)

        if len(subprojects) == 0:
            abort(404)
        return {'participants': [marshal(x, FIELDS.get('participant_fields'))\
                for x in participants]}


# specific participant
class ParticipantAPI(Resource):

    decorators = [auth.login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('pID', type=str, required=True,\
                help='Participant ID required', location='json')
        super(ParticipantAPI, self).__init__()

    def get(self, cli_id, proj_id, subproj_id, participant_id):
        # get client name
        clientname = [x for x in clients\
                if x.get('cli_id') == cli_id][0]['name']

        # get project name
        projects = project_list(clientname)
        projects = make_proj(projects, cli_id)
        projectname = [x for x in projects\
                if x.get('proj_id') == proj_id][0].get('name')

        # get subproject name
        subprojects = subproject_list(clientname, projectname)
        subprojects = make_subproj(subprojects, cli_id, proj_id)
        subprojectname = [x for x in subprojects\
                if x.get('subproj_id') == subproj_id][0].get('name')

        # list of participants
        participants = participant_list(clientname, projectname, subprojectname)
        participants = make_participant(subprojects, cli_id, proj_id,\
                subproj_id)
        participant = [x for x in participants\
                if x.get('participant_id') == participant_id][0].get('name')

        if len(subprojects) == 0:
            abort(404)
        return {'participant': marshal(participant,\
                FIELDS.get('participant_fields'))}


#------------------------------------------------
# Add Resources
def add_resources():
    """a"""
    # client
    clients_string = '/dstatus/api/clients'
    api.add_resource(ClientListAPI, clients_string, endpoint='clients')

    client_string = clients_string + '/<int:cli_id>'
    api.add_resource(ClientAPI, client_string, endpoint='client')
    # project
    projects_string = client_string + '/projects'
    api.add_resource(ProjectListAPI, projects_string, endpoint='projects')

    project_string = projects_string + '/<int:proj_id>'
    api.add_resource(ProjectAPI, project_string, endpoint='project')

    # subproject
    subprojects_string = project_string + '/subprojects'
    api.add_resource(SubprojectListAPI, subprojects_string,\
            endpoint='subprojects')

    subproject_string = subprojects_string + '/<int:subproj_id>'
    api.add_resource(SubprojectAPI, subproject_string, endpoint='subproject')

    # participant
    participants_string = subproject_string + '/participants'
    api.add_resource(ParticipantListAPI, participants_string,\
            endpoint='participants')

    participant_string = participants_string + '/<int:participant_id>'
    api.add_resource(ParticipantAPI, participant_string, endpoint='participant')

add_resources()


if __name__ == '__main__':
    app.run(debug=True, port=8888)

