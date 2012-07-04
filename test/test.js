var ctfd = require('CTFd');
 

module.exports = {
    'UserDataParser appending string with two newlines emits two events' : function(beforeExit, assert) {
        var count = 0,
            userDataParser = new ctfd.UserDataParser();
        
        userDataParser.on('line', function() {
            count++;
        });
        
        userDataParser.append("First\nSecond\nThird but without newline");
        assert.equal(2, count);
    },
    'UserDataParser unhandles data is returned from append' : function(beforeExit, assert) {
        var userDataParser = new ctfd.UserDataParser();
        assert.equal('Without newline', userDataParser.append("First\nSecond\nWithout newline"));
    },
    'UserDataParser Line beginning with "TEAM " emits "TEAM" event' : function(beforeExit, assert) {
        var userDataParser = new ctfd.UserDataParser(),
            wasCalled = false;
        
        userDataParser.on('TEAM', function(team) {
            assert.equal('SomeTeam', team);
            wasCalled = true;
        });

        userDataParser.append("TEAM SomeTeam\n");
        assert.equal(true, wasCalled);
    },
    'UserDataParser Unsupported command emits "malformed" event' : function(beforeExit, assert) {
        var userDataParser = new ctfd.UserDataParser(),
            wasCalled = false;

        userDataParser.on('malformed', function() {
            wasCalled = true;
        });

        userDataParser.append("BLAR blimblam\n");
        assert.equal(true, wasCalled);
    },
    'UserDataParser Data can be appended in blocks' : function(beforeExit, assert) {
        var userDataParser = new ctfd.UserDataParser(),
            wasCalled = false;

        userDataParser.on('TEAM', function(team) {
            assert.equal('SomeTeam', team);
            wasCalled = true;
        });

        assert.equal(false, wasCalled);
        userDataParser.append('T');
        assert.equal(false, wasCalled);
        userDataParser.append('E');
        assert.equal(false, wasCalled);
        userDataParser.append('A');
        assert.equal(false, wasCalled);
        userDataParser.append('M');
        assert.equal(false, wasCalled);
        userDataParser.append(' SomeTeam');
        assert.equal(false, wasCalled);
        userDataParser.append("\n");
        assert.equal(true, wasCalled);
    },
    'UserDataParser Flag after Team fires FLAG' : function(beforeExit, assert) {
        var userDataParser = new ctfd.UserDataParser(),
            wasCalled = false;

        userDataParser.on('FLAG', function(flag) {
            assert.equal('myflag', flag);
            wasCalled = true;
        });
        userDataParser.append("TEAM MyTeam\r\n");
        userDataParser.append("FLAG myflag\r\n");
        assert.equal(true, wasCalled);
    },
    'UserDataParser Many newlines' : function(beforeExit, assert) {
        var userDataParser = new ctfd.UserDataParser(),
            wasCalled = false;

        userDataParser.on('FLAG', function(flag) {
            assert.equal('myflag', flag);
            wasCalled = true;
        });
        userDataParser.append("TEAM MyTeam\r\n\n\r\r\r\n\n\n");
        userDataParser.append("\n\n\n\r\n\r\r\nFLAG myflag\r\n\n\n\n\r\n\r\r\n");
        assert.equal(true, wasCalled);
    },
    'FlagFactory flag length is as specicfied' : function(beforeExit, assert) {
        var flagLength = 64,
            nameLength = 15,
            factory = new ctfd.FlagFactory(nameLength, flagLength),
            d = factory.createFlag();
        assert.equal(flagLength, d.data.length);
    },
    'FlagFactory name length is as specicfied' : function(beforeExit, assert) {
        var flagLength = 64,
            nameLength = 15,
            factory = new ctfd.FlagFactory(nameLength, flagLength),
            d = factory.createFlag();
        assert.equal(nameLength, d.name.length);
    },
    'FlagFactory returned flag is emitted' : function(beforeExit, assert) {
        var factory = new ctfd.FlagFactory(15, 64),
            emitted = undefined,
            returned = undefined;

        factory.on('flag', function(f) {
            emitted = f;
        });

        returned = factory.createFlag();

        assert.isDefined(returned);
        assert.equal(emitted, returned);
    },
    'templateSubstitute substitutes' : function(beforeExit, assert) {
        var template = '%SERVICE_DIR%/prog',
            hash = {
                SERVICE_DIR : '/path'
            };
        assert.equal('/path/prog', ctfd.templateSubstitute(template, hash));
    },
    'templateSubstitute substitutes several' : function(beforeExit, assert) {
        var template = '%SERVICE_DIR%/prog %HOST%',
            hash = {
                SERVICE_DIR : '/path',
                HOST : '192.168.1.1'
            };
        assert.equal('/path/prog 192.168.1.1', ctfd.templateSubstitute(template, hash));
    },
    'templateSubstitute substitutes several occurences' : function(beforeExit, assert) {
        var template = '%SERVICE_DIR%/prog %HOST% %HOST%',
            hash = {
                SERVICE_DIR : '/path',
                HOST : '192.168.1.1'
            };
        assert.equal('/path/prog 192.168.1.1 192.168.1.1', ctfd.templateSubstitute(template, hash));
    }
};
