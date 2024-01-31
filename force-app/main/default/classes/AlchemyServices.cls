public with sharing class AlchemyServices {
    
    @AuraEnabled
    public static List<SObject> doQuery(String soql){
        try {
            return Database.query(soql);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
