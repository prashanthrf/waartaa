function initializeServers () {
  var user = Meteor.users.findOne({username: SUPER_USER});
  if (! user) {
    Accounts.createUser({
      username: SUPER_USER,
      email: SUPER_USER_EMAIL,
      password: SUPER_USER_PASSWORD,
      profile: {connections: {}}
    });
    var user = Meteor.users.findOne({username: SUPER_USER});
  }
  for (server_name in GlobalServers) {
    var server = Servers.findOne({name: server_name});
    if (! server) {
      var now = new Date();
      var server_data = GlobalServers[server_name];
      var server_id = Servers.insert({
        name: server_name,
        connections: server_data.connections,
        created: now,
        creator: user.username,
        creator_id: user._id,
        last_updated: now,
        last_updater: user.username,
        last_updater_id: user._id,
      });
    }
  }
}

function observeChatrooms () {
  var userServersCursor = UserServers.find(
    {active: true, status: 'connected'},
    {created: 0, last_updated: 0}
  );
  var userChannelsCursor = UserChannels.find(
    {active: true, server_active: true, status: 'connected'},
    {last_updated: 0, created: 0}
  );
  userServersCursor.observeChanges({
    added: function (id, fields) {
      var userServer = UserServers.findOne({_id: id});
      var roomSignature = userServer.name;
      UnreadLogsCount.upsert({
        room_signature: roomSignature,
        user: userServer.user
      }, {
        $set: {
          last_updated_at: new Date(),
          offset: chatRoomLogCount.getCurrentLogCountForInterval(
            roomSignature)
        }
      });
    },
    removed: function (id) {
      var userServer = UserServers.findOne({_id: id});
      if (userServer)
        UnreadLogsCount.remove({
          room_signature: userServer.name,
          user: userServer.user
        });
    }
  });

  userChannelsCursor.observeChanges({
    added: function (id, fields) {
      var userChannel = UserChannels.findOne({_id: id});
      var roomSignature = userChannel.user_server_name + '::' +
        userChannel.name;
      UnreadLogsCount.upsert({
        room_signature: roomSignature,
        user: userChannel.user
      }, {
        $set: {
          last_updated_at: new Date(),
          offset: chatRoomLogCount.getCurrentLogCountForInterval(
            roomSignature)
        }
      });
    },
    removed: function (id) {
      var userChannel = UserChannels.findOne({_id: id});
      if (userChannel) {
        UnreadLogsCount.remove({
          room_signature: userChannel.user_server_name + '::' +
            userChannel.name,
          user: userChannel.user
        });
    }
    }
  });
}

Meteor.startup(function () {
  initializeServers();
  observeChatrooms();
});
