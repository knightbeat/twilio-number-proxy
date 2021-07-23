const accountSid = process.env.TWILIO_ACC_SID;
const authToken = process.env.TWILIO_TOKEN;
const client = require("twilio")(accountSid, authToken);
const express = require("express");

const app = express();
app.use(express.json());

/*
e.g: (VSCode REST Client)

POST http://localhost:5000/sms/conversations
Content-Type: application/json

{
    "proxyNumberSids": [
      "PNcdd0...376e58b", 
      "PNvss0...425t62g"
    ],
    "participants": [
      { "friendlyName": "Walter", "identifier": "+447400011223" },
      { "friendlyName": "Jessey", "identifier": "+447722288812" }
    ],
    "serviceParameters": { 
      "uniqueName": "MyNumberProxyService" 
    }
}

*/
app.post("/sms/conversations", (req, resp) => {
  console.log(req.body);
  const participants = req.body.participants;
  const serviceParams = req.body.serviceParameters;
  const twilioPhoneNumberSids = req.body.proxyNumberSids;

  createProxyService(serviceParams, twilioPhoneNumberSids, participants);
  resp.sendStatus(202);
});

app.delete("/sms/conversations", (req, resp) => {
  deleteExistingProxyServices();
  resp.sendStatus(202);
});

// create a proxy service
function createProxyService(params, twilioPhoneNumberSids, participantsList) {
  console.log("Step 1: Creating a proxy service...");
  client.proxy.services.create(params).then((proxyService) => {
    console.log(`Proxy Service created with SID ${proxyService.sid}`);
    buildProxyPhoneNumbersPool(proxyService, twilioPhoneNumberSids);
    createSMSConversationSession(proxyService, participantsList);
  });
}
// construct a proxy (twilio) phone number pool
const buildProxyPhoneNumbersPool = (proxyService, twilioPhoneNumberSids) => {
  console.log(
    `Step 2A: Building proxy Numbers pool for the service ${proxyService.sid}...`
  );
  twilioPhoneNumberSids.forEach((numberSid) => {
    console.log(`Adding number SID ${numberSid}`);
    client.proxy
      .services(proxyService.sid)
      .phoneNumbers.create({ sid: numberSid })
      .then((phone_number) => {
        console.log(phone_number.sid);
        console.log(`Number SID ${phone_number.sid} Added`);
      });
  });
};
// create a session for conversation between taxi driver and the passenger
const createSMSConversationSession = (proxyService, participantsList) => {
  console.log(
    `Step 2B: Creating SMS Conversation Session in Service ${proxyService.sid}...`
  );
  client.proxy
    .services(proxyService.sid)
    .sessions.create()
    .then((session) => {
      console.log(`SMS Connversation Session created with ID ${session.sid}`);
      addParticipantsToSMSConversation(proxyService, session, participantsList);
    });
};
// add participants to the conversation session
const addParticipantsToSMSConversation = (
  proxyService,
  messagingSession,
  participantsList
) => {
  console.log(
    `Step 3: Creating Participants in Session ${messagingSession.sid} of Service ${proxyService.sid}`
  );
  participantsList.forEach((participant) => {
    client.proxy
      .services(proxyService.sid)
      .sessions(messagingSession.sid)
      .participants.create(participant)
      .then((participant) => {
        console.log(
          `Participant with ${participant.identifier} added to Session ${messagingSession.sid}`
        );
      });
  });
};
// delete entire set of objects associated to a certain conversation
const deleteConversationObjects = (proxyServiceSid) => {
  client.proxy.services(proxyServiceSid).remove();
};

const listExistingProxyServices = () => {
  client.proxy.services.list({ limit: 20 }).then((services) => {
    if (services.length < 1) console.log("No proxy services found!");
    else services.forEach((s) => console.log(s.sid));
  });
};
const deleteExistingProxyServices = () => {
  client.proxy.services.list({ limit: 20 }).then((services) => {
    if (services.length < 1) console.log("No proxy services found!");
    else services.forEach((s) => client.proxy.services(s.sid).remove());
  });
};
const listProxyPhoneNumbersOfService = (proxyServiceSid) => {
  client.proxy
    .services(proxyServiceSid)
    .phoneNumbers.list({ limit: 20 })
    .then((phoneNumbers) => phoneNumbers.forEach((p) => console.log(p.sid)));
};
const listAllSessionsOfService = (proxyServiceSid) => {
  client.proxy
    .services(proxyServiceSid)
    .sessions.list({ limit: 20 })
    .then((sessions) => sessions.forEach((s) => console.log(s.sid)));
};

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Server Started. Listening to port ${port}...`)
);
