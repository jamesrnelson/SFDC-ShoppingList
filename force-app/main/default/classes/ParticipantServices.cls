public without sharing class ParticipantServices {

    public static final String SUCCESS_DO_CREATE_MESSAGE = 'Successfully updated Channel Involvement Deal Registration status.';

    
    public static void createUniquePairs(List<Participant__c> newParticipants) {
        //non-bulkified method for simplicity
        List<Unique_Pair__c> pairs = new List<Unique_Pair__c>();
        Participant__c newParticipant = newParticipants[0];
        List<Participant__c> participants = [SELECT Id, Active__c FROM Participant__c WHERE Id != :newParticipant.Id];

        for (Participant__c eachParticipant : participants) {
            // Boolean activeStatus =  newParticipant.Active__c && eachParticipant.Active__c ? true : false;
            pairs.add(new Unique_Pair__c(Participant_1__c = newParticipant.Id, Participant_2__c = eachParticipant.Id));
        }

        insert pairs;
    }

    @AuraEnabled
    public static string getExistingGroupsWithParticipants(String sessionId){
        try {
            String groups = JSON.serializePretty([
                SELECT Id, Name, (SELECT Id, Participant__r.Name, Participant__c FROM Group_Participants__r)
                FROM Group__c
                WHERE Session__c = :sessionId
                ORDER BY Name ASC
            ]);
            System.debug('groups:: ' + groups);
            return groups;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<SObject> doQuery(String soql){
        try {
            return Database.query(soql);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static string getAllUniquePairs(){
        try {
            return JSON.serialize([SELECT Id, Participant_1__c, Participant_2__c, Participant_1__r.Name, Participant_2__r.Name, Active__c, Count__c FROM Unique_Pair__c WHERE Active__c = true ORDER BY Count__c ASC]);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    @AuraEnabled
    public static string getNumberOfActiveParticipants(){
        try {
            return JSON.serialize([SELECT Id, Name, Active__c, Title__c FROM Participant__c WHERE Active__c = true]);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static String createRecords(String recordsToCreate, String sessionId) {
        try {
            System.debug('recordsToCreate:: ' + recordsToCreate);
            List<GroupWrapper> records = (List<GroupWrapper>)JSON.deserialize(recordsToCreate, List<GroupWrapper>.class);
            List<Group__c> groupsToCreate = new List<Group__c>();
            for (GroupWrapper wrapper : records) {
                groupsToCreate.add(new Group__c(Name=wrapper.id, Session__c = sessionId));
            }

            insert groupsToCreate;

            Map<String,String> groupMap = new Map<String,String>();
            for (Group__c groupRecord : groupsToCreate) {
                groupMap.put(groupRecord.Name, groupRecord.Id);
            }
            
            List<Group_Participant__c> groupParticipantsToCreate = new List<Group_Participant__c>();
            for(GroupWrapper groupWrapper : records) {
                for (String participantId : groupWrapper.ids) {
                    groupParticipantsToCreate.add(new Group_Participant__c(
                        Group__c = groupMap.get(groupWrapper.id),
                        Participant__c = participantId
                    ));
                }
            }

            insert groupParticipantsToCreate;
            
            return SUCCESS_DO_CREATE_MESSAGE;
        } catch (Exception ex) {
            throw new AuraHandledException('There was an error processing your request: ' + ex.getMessage() + '. Stack Trace: ' + ex.getStackTraceString()); 
        }
    }

    @AuraEnabled
    public static String doUpdate(String recordsToUpdate) {
        try {
            List<SObject> records = (List<sObject>)JSON.deserialize(recordsToUpdate, List<SObject>.class);
            Database.update(records);
            return 'SUCCESS';
        } catch (Exception ex) {
            throw new AuraHandledException('There was an error processing your request: ' + ex.getMessage() + '. Stack Trace: ' + ex.getStackTraceString()); 
        }
    }

    public class GroupWrapper {
        String id;
        String recordId;
        List<String> ids;
    }
}
