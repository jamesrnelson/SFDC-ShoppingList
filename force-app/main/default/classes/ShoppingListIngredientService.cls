public with sharing class ShoppingListIngredientService {
    public static void cleanUpShoppingListIngredients() {
        DateTime nowDateTime = DateTime.now();
        DateTime endTime = DateTime.newInstance(nowDateTime.year(), nowDateTime.month(), nowDateTime.day(), 0, 0, 0);
        DateTime startTime = endTime.addDays(-30);

        List<Shopping_List_Ingredient__c> ingredientsToDelete = [SELECT Id FROM Shopping_List_Ingredient__c WHERE CreatedDate < :startTime];

        delete ingredientsToDelete;
    }
}