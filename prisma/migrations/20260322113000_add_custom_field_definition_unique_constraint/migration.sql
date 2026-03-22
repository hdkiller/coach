CREATE UNIQUE INDEX "CustomFieldDefinition_ownerId_entityType_fieldKey_key"
ON "CustomFieldDefinition"("ownerId", "entityType", "fieldKey");
