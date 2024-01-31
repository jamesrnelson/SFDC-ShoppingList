trigger Participant on Participant__c (after insert) {
    if (Trigger.isAfter && Trigger.isInsert) {
        ParticipantServices.createUniquePairs(Trigger.New);
    } 
}