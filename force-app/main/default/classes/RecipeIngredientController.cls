public with sharing class RecipeIngredientController {
    public RecipeIngredientController() {

    }

    @AuraEnabled(cacheable=true)
    public static List<Recipe__c> getRecipesWithIngredients(String param) {
        string tempInput = '%' + param + '%';
        List<Recipe__c> matchingRecipes = [
            SELECT Id, Name, Link_to_Online_Recipe__c,
                (SELECT Id, Ingredient__c, Ingredient__r.Name, Measurement__c, Quantity__c FROM Ingredients__r)
            FROM Recipe__c WHERE Name LIKE :tempInput
        ];

        return matchingRecipes;
    }

    @AuraEnabled(cacheable=true)
    public static List<Ingredient__c> getSearchedIngredients(String param) {
        string tempInput = '%' + param + '%';
        List<Ingredient__c> matchingIngredients = [
            SELECT Id, Name
            FROM Ingredient__c WHERE Name LIKE :tempInput ORDER BY Name ASC
        ];

        return matchingIngredients;
    }

    @AuraEnabled(cacheable=true)
    public static List<Shopping_List_Recipe__c> getShoppingListRecipes(String shoppingListId) {
        List<Shopping_List_Recipe__c> listRecipes = [
            SELECT Recipe__c, Recipe__r.Name, Recipe__r.Link_to_Online_Recipe__c
            FROM Shopping_List_Recipe__c WHERE Shopping_List__c = :shoppingListId
            ORDER BY Recipe__r.Name ASC
        ];

        return listRecipes;
    }

    @AuraEnabled(cacheable=true)
    public static List<Shopping_List_Ingredient__c> getShoppingListIngredients(String shoppingListId) {
        List<Shopping_List_Ingredient__c> listIngredients = [
            SELECT Ingredient__r.Name, Measurement__c, Quantity__c
            FROM Shopping_List_Ingredient__c WHERE Shopping_List__c = :shoppingListId
            ORDER BY Ingredient__r.Name ASC
        ];

        return listIngredients;
    }

    @AuraEnabled(cacheable=true)
    public static List<Recipe_Ingredient__c> getRecipeIngredients(String recipeId) {
        List<Recipe_Ingredient__c> listIngredients = [
            SELECT Ingredient__r.Name, Measurement__c, Quantity__c
            FROM Recipe_Ingredient__c WHERE Recipe__c = :recipeId
            ORDER BY Ingredient__r.Name ASC
        ];

        return listIngredients;
    }

    @AuraEnabled
    public static void relateRecipeAndIngredientsToGroceryList(Recipe__c addedRecipe, String shoppingListId){
        try {
            List<Recipe_Ingredient__c> recipeIngredients = [
                SELECT Id, Ingredient__c, Ingredient__r.Name, Measurement__c, Quantity__c
                FROM Recipe_Ingredient__c WHERE Recipe__c = :addedRecipe.Id
            ];
            if (recipeIngredients.isEmpty()) {
                String customMessage = 'This recipe has no ingredients. Please add ingredients to it and try again.';
                AuraHandledException auraException =  new AuraHandledException(customMessage);
                throw auraException;
            }
            List<Shopping_List_Ingredient__c> queriedIngredients = [
                SELECT Id, Shopping_List__c, Ingredient__c, Measurement__c, Quantity__c
                FROM Shopping_List_Ingredient__c
                WHERE Shopping_List__c = :shoppingListId
            ];
            Map<String,Shopping_List_Ingredient__c> listIngredientsById = new Map<String,Shopping_List_Ingredient__c>();
            List<Shopping_List_Ingredient__c> listIngredientsToInsert = new List<Shopping_List_Ingredient__c>();
            for (Shopping_List_Ingredient__c listIngredient : queriedIngredients) {
                listIngredientsById.put(listIngredient.Ingredient__c, listIngredient);
            } 

            for (Recipe_Ingredient__c recipeIngredient : recipeIngredients) {
                if (!listIngredientsById.containsKey(recipeIngredient.Ingredient__c)) {
                    listIngredientsById.put(recipeIngredient.Ingredient__c, convertRecipeIngredientToShoppingListIngredient(recipeIngredient, shoppingListId));
                } else {
                    mergeRecipeIngredientAndShoppingListIngredient(recipeIngredient, listIngredientsById.get(recipeIngredient.Ingredient__c));
                }
                // listIngredientsToInsert.add(convertRecipeIngredientToShoppingListIngredient(recipeIngredient, shoppingListId));
            }

            // upsert listIngredientsById.values();

            upsert listIngredientsById.values();
            insert new Shopping_List_Recipe__c(Recipe__c = addedRecipe.Id, Shopping_List__c = shoppingListId);
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void createIngredient(String ingredientName) {
        Ingredient__c newIngredient = new Ingredient__c(Name = ingredientName);

        insert newIngredient;
    }
   
    @AuraEnabled
    public static void createRecipeIngredient(Recipe_Ingredient__c recipeIngredient) {
        try {
            insert recipeIngredient;
        } catch(Exception e) {
            throw new AuraHandledException('There was an error adding the ingredient to your recipe. See this error: ' +
                e.getMessage() + 'Stack Trace: ' + e.getStackTraceString()
            );
        }
    }

    @AuraEnabled
    public static void createRecipeOrShoppingListIngredient(String junctionIngredient) {
        try {
            SObject recordToInsert = (SObject)JSON.deserialize(junctionIngredient, SObject.class);
            insert recordToInsert;
        } catch(Exception e) {
            throw new AuraHandledException('There was an error adding the ingredient. See this error: ' +
                e.getMessage() + 'Stack Trace: ' + e.getStackTraceString()
            );
        }
    }

    public static Shopping_List_Ingredient__c convertRecipeIngredientToShoppingListIngredient(Recipe_Ingredient__c recipeIngredient, String shoppingListId) {
        return new Shopping_List_Ingredient__c(
            Ingredient__c = recipeIngredient.Ingredient__c,
            Shopping_List__c = shoppingListId,
            Quantity__c = recipeIngredient.Quantity__c,
            Measurement__c = recipeIngredient.Measurement__c
        );
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String,String>> getFieldPicklistValues(String objectApiName, String fieldApiName) {
        List<Map<String,String>> picklistValues = new List<Map<String,String>>();
        try {
            //get all objects
            Map<String, Schema.sObjectType> gd = Schema.getGlobalDescribe();
            //retrieve object type
            Schema.sObjectType targetType = gd.get(objectApiName);
            //retrieve all fields on object
            Map<String, Schema.sObjectField> fieldMap = targetType.getDescribe().fields.getMap();
            //get only field being passed into method
            Schema.sObjectField targetField = fieldMap.get(fieldApiName);
            Schema.DescribeFieldResult fieldResult = targetField.getDescribe(); 
            //get picklist values for field
            List<Schema.PicklistEntry> allPicklistValues = fieldResult.getPicklistValues();

            Map<String,String> nonePicklistValue = new Map<String,String>();
            nonePicklistValue.put('label', '--None--');
            nonePicklistValue.put('value', null);
            picklistValues.add(nonePicklistValue);

            for(Schema.PicklistEntry value : allPicklistValues) {
                if (value.isActive()) {
                    Map<String,String> picklistValue= new Map<String,String>();
                    picklistValue.put('label', value.getLabel());
                    picklistValue.put('value', value.getValue());
                    picklistValues.add(picklistValue);  
                }
            } 
            return picklistValues;
        } catch (Exception ex) {
            throw new AuraHandledException('There was an error retrieving picklist values for ' + fieldApiName + ' on the ' + objectApiName + ' object: ' + ex.getMessage() + '. Stack Trace: ' + ex.getStackTraceString());
        }
    }

    public static void mergeRecipeIngredientAndShoppingListIngredient(Recipe_Ingredient__c recipeIngredient, Shopping_List_Ingredient__c listIngredient) {
        String storedMeasurement = listIngredient.Measurement__c;
        Decimal storedQuantity = listIngredient.Quantity__c;
        String newMeasurement = recipeIngredient.Measurement__c;
        Decimal newQuantity = recipeIngredient.Quantity__c;

        Decimal storedQuantityInOunces = convertToOunces(storedMeasurement, storedQuantity);
        Decimal newQuantityInOunces = convertToOunces(newMeasurement, newQuantity);

        if(String.isBlank(storedMeasurement) || String.isBlank(newMeasurement)) {
            listIngredient.Quantity__c = listIngredient.Quantity__c + recipeIngredient.Quantity__c;
            listIngredient.Measurement__c = '';
        } else if (storedMeasurement == newMeasurement) {
            listIngredient.Quantity__c = listIngredient.Quantity__c + recipeIngredient.Quantity__c;
        } else if (storedMeasurement == 'lbs' || newMeasurement == 'lbs') {
            listIngredient.Quantity__c = ((storedQuantityInOunces + newQuantityInOunces)/16).setScale(3);
            listIngredient.Measurement__c = 'lbs';
        } else if (storedMeasurement == 'C.' || newMeasurement == 'C.') {
            listIngredient.Quantity__c = ((storedQuantityInOunces + newQuantityInOunces)/8).setScale(3);
            listIngredient.Measurement__c = 'C.';
        } else if (storedMeasurement == 'oz' || newMeasurement == 'oz') {
            listIngredient.Quantity__c = (storedQuantityInOunces + newQuantityInOunces);
            listIngredient.Measurement__c = 'oz';
        } else if (storedMeasurement == 'Tbsp' || newMeasurement == 'Tbsp') {
            listIngredient.Quantity__c = ((storedQuantityInOunces + newQuantityInOunces) * 2).setScale(3);
            listIngredient.Measurement__c = 'Tbsp';
        } else if (storedMeasurement == 'tsp.' || newMeasurement == 'tsp.') {
            listIngredient.Quantity__c = ((storedQuantityInOunces + newQuantityInOunces) * 6).setScale(3);
            listIngredient.Measurement__c = 'tsp.';
        } else {
            listIngredient.Quantity__c = storedQuantityInOunces + newQuantityInOunces;
            listIngredient.Measurement__c = 'oz';
        }

    }

    public static Decimal convertToOunces(String measurement, Decimal quantity) {
        Decimal multiplier;
        switch on (measurement) {
            when 'C.' {
                multiplier = 8;
            }
            when 'tsp.' {
                multiplier = 1.0/6.0;
                System.debug('tsp multiplier value ==> ' + multiplier);
            }
            when 'Tbsp' {
                multiplier = (0.5);
            }
            when 'lbs' {
                multiplier = (1.0/16.0);
            }
            when 'oz' {
                multiplier = 1;
            }
            when null {
                multiplier = 0;
            }
        }
        return multiplier * quantity;
    }

    @AuraEnabled(cacheable=true)
    public static List<Shopping_List__c> getMostRecentShoppingLists(){
        try {
            List<Shopping_List__c> lists = [SELECT Id, Name, CreatedBy.Name, Store__r.Name, CreatedDate FROM Shopping_List__c ORDER BY CreatedDate DESC LIMIT 10];
            return lists;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}