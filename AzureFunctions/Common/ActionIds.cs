namespace AzureFunctions.Common
{
    public static class ActionIds
    {
        public static readonly string MissingAzureWebjobsStorageAppSetting = $"/heal_actions/{nameof(MissingAzureWebjobsStorageAppSetting)}";
        public static readonly string MissingAzureWebJobsDashboardAppSetting = $"/heal_actions/{nameof(MissingAzureWebJobsDashboardAppSetting)}";
        public static readonly string MissingFunctionsExtensionVersionAppSetting = $"/heal_actions/{nameof(MissingFunctionsExtensionVersionAppSetting)}";
        public static readonly string MissingAzureFilesConnectionString = $"/heal_actions/{nameof(MissingAzureFilesConnectionString)}";
        public static readonly string MissingAzureFilesContentShare = $"/heal_actions/{nameof(MissingAzureFilesContentShare)}";
        public static readonly string InvalidStorageConnectionString = $"/heal_actions/{nameof(InvalidStorageConnectionString)}";
        public static readonly string StorageAccountDoesNotExist = $"/heal_actions/{nameof(StorageAccountDoesNotExist)}";
        public static readonly string StorageAccountDoesntSupportQueues = $"/heal_actions/{nameof(StorageAccountDoesntSupportQueues)}";
    }
}