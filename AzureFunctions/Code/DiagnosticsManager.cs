using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using AzureFunctions.Common;
using AzureFunctions.Contracts;
using AzureFunctions.Models;
using AzureFunctions.ResourcesPortal;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AzureFunctions.Code
{
    public class DiagnosticsManager : IDiagnosticsManager
    {
        private readonly IArmClient _client;
        const string AntaresApiVersion = "2015-08-01";

        const string AzureWebJobsStorageAppSetting = "AzureWebJobsStorage";
        const string AzureWebJobsDashboardAppSetting = "AzureWebJobsDashboard";
        const string FunctionsExtensionVersionAppSetting = "FUNCTIONS_EXTENSION_VERSION";
        const string AzureFilesConnectionString = "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING";
        const string AzureFilesContentShare = "WEBSITE_CONTENTSHARE";

        public DiagnosticsManager(IArmClient client)
        {
            _client = client;
        }

        public async Task<DiagnosticsResult> Diagnose(string armId)
        {
            // Check resource existence
            var resourceExistanceTupe = await CheckResourceExistance(armId);
            if (!resourceExistanceTupe.Item1.IsDiagnosingSuccessful ||
                resourceExistanceTupe.Item1.SuccessResult.HealingActions.Any())
            {
                return resourceExistanceTupe.Item1;
            }

            var functionApp = resourceExistanceTupe.Item2;

            // check app settings
            var appSettingsTuple = await CheckAppSettings(functionApp);
            if (!appSettingsTuple.Item1.IsDiagnosingSuccessful || )
            {
                return appSettingsTuple.Item1;
            }

            // Check storage existence.
            var storageCheckResult = await CheckStorage(appSettingsTuple.Item2[AzureWebJobsStorageAppSetting]);

            // check running state

            // check if it's some cross stamp issue

            // check dns resolution and that it matches stamp

            // host 500s:
            //    - Crypto errors
            //    - App Init
            //    - Host crash loop
            
        }

        private async Task<DiagnosticsResult> CheckStorage(string connectionString)
        {
            if (string.IsNullOrEmpty(connectionString))
            {
                return new DiagnosticsResult
                {
                    IsDiagnosingSuccessful = true,
                    SuccessResult = new DiagnoseSuccessResult
                    {
                        HealingActions = Enumerable.Empty<HealingAction>()
                    }
                };
            }

            var storageAccountName = connectionString
                .Split(';')
                .FirstOrDefault(e => e.StartsWith("AccountName", StringComparison.OrdinalIgnoreCase))
                ?.Split('=')
                ?.Last();

            if (string.IsNullOrEmpty(storageAccountName))
            {
                return new DiagnosticsResult
                {
                    IsDiagnosingSuccessful = true,
                    SuccessResult = new DiagnoseSuccessResult
                    {
                        HealingActions = new[]
                        {
                            new HealingAction
                            {
                                Action = Resources.backend_error_InvalidStorageConnectionString,
                                ActionId = ActionIds.InvalidStorageConnectionString
                            }
                        }
                    }
                };
            }

            var storageQueuesCName = $"{storageAccountName}.queue.core.windows.net";
            var storageBlobCName = $"{storageAccountName}.blob.core.windows.net";
            if (!await IsHostAvailable(storageBlobCName))
            {
                return new DiagnosticsResult
                {
                    IsDiagnosingSuccessful = true,
                    SuccessResult = new DiagnoseSuccessResult
                    {
                        HealingActions = new[]
                        {
                            new HealingAction
                            {
                                Action = string.Format(Resources.backend_error_StorageAccountDoesNotExist, storageAccountName),
                                ActionId = ActionIds.StorageAccountDoesNotExist
                            }
                        }
                    }
                };
            }

            if (!await IsHostAvailable(storageQueuesCName))
            {
                return new DiagnosticsResult
                {
                    IsDiagnosingSuccessful = true,
                    SuccessResult = new DiagnoseSuccessResult
                    {
                        HealingActions = new[]
                        {
                            new HealingAction
                            {
                                Action = string.Format(Resources.backend_error_StorageAccountDoesntSupportQueues, storageAccountName),
                                ActionId = ActionIds.StorageAccountDoesntSupportQueues
                            }
                        }
                    }
                };
            }

            return new DiagnosticsResult
            {
                IsDiagnosingSuccessful = true,
                SuccessResult = new DiagnoseSuccessResult
                {
                    HealingActions = Enumerable.Empty<HealingAction>()
                }
            };
        }

        private async Task<bool> IsHostAvailable(string domain)
        {
            try
            {
                var addresses = await Dns.GetHostAddressesAsync(domain);
                if (addresses.Any())
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch
            {
                return false;
            }
        }

        private async Task<Tuple<DiagnosticsResult, Dictionary<string, string>>> CheckAppSettings(ArmResource<ArmFunctionApp> functionApp)
        {
            var armId = $"{functionApp.Id}/config/appsettings/list";
            var maybeAppSettings = await _client.Post<ArmResource<Dictionary<string, string>>>(armId, AntaresApiVersion);
            if (!maybeAppSettings.IsSuccessful)
            {
                return Tuple.Create(HandleArmResponseError(armId, maybeAppSettings.Error), new Dictionary<string, string>());
            }
            else
            {
                var appSettings = maybeAppSettings.Result;
                var terminating = false;
                var healingActions = new List<HealingAction>();

                if (!appSettings.Properties.Any(k => k.Key.Equals(AzureWebJobsStorageAppSetting, StringComparison.OrdinalIgnoreCase)))
                {
                    terminating = true;
                    healingActions.Add(new HealingAction
                    {
                        Action = string.Format(Resources.backend_error_MissingAzureWebJobsStorageAppSetting, AzureWebJobsStorageAppSetting),
                        ActionId = ActionIds.MissingAzureWebjobsStorageAppSetting
                    });
                }

                if (!appSettings.Properties.Any(k => k.Key.Equals(AzureWebJobsDashboardAppSetting, StringComparison.OrdinalIgnoreCase)))
                {
                    healingActions.Add(new HealingAction
                    {
                        Action = string.Format(Resources.backend_error_MissingAzureWebJobsDashboardAppSetting, AzureWebJobsDashboardAppSetting),
                        ActionId = ActionIds.MissingAzureWebJobsDashboardAppSetting
                    });
                }

                if (!appSettings.Properties.Any(k => k.Key.Equals(FunctionsExtensionVersionAppSetting, StringComparison.OrdinalIgnoreCase)))
                {
                    healingActions.Add(new HealingAction
                    {
                        Action = string.Format(Resources.backend_error_MissingFunctionsExtensionVersionAppSetting, FunctionsExtensionVersionAppSetting),
                        ActionId = ActionIds.MissingFunctionsExtensionVersionAppSetting
                    });
                }

                if (functionApp.Properties.Sku.Equals("Dynamic", StringComparison.OrdinalIgnoreCase) &&
                    !appSettings.Properties.Any(k => k.Key.Equals(AzureFilesConnectionString, StringComparison.OrdinalIgnoreCase)))
                {
                    terminating = true;
                    healingActions.Add(new HealingAction
                    {
                        Action = string.Format(Resources.backend_error_MissingAzureFilesConnectionString, AzureFilesConnectionString),
                        ActionId = ActionIds.MissingAzureFilesConnectionString
                    });
                }

                if (functionApp.Properties.Sku.Equals("Dynamic", StringComparison.OrdinalIgnoreCase) &&
                    !appSettings.Properties.Any(k => k.Key.Equals(AzureFilesContentShare, StringComparison.OrdinalIgnoreCase)))
                {
                    terminating = true;
                    healingActions.Add(new HealingAction
                    {
                        Action = string.Format(Resources.backend_error_MissingAzureFilesContentShare, AzureFilesContentShare),
                        ActionId = ActionIds.MissingAzureFilesContentShare
                    });
                }

                return Tuple.Create(
                        new DiagnosticsResult
                        {
                            IsDiagnosingSuccessful = true,
                            SuccessResult = new DiagnoseSuccessResult
                            {
                                Terminating = terminating,
                                HealingActions = healingActions
                            }
                        }, appSettings.Properties);
            }
        }

        private async Task<Tuple<DiagnosticsResult, ArmResource<ArmFunctionApp>>> CheckResourceExistance(string armId)
        {
            var maybeFunctionApp = await _client.Get<ArmResource<ArmFunctionApp>>(armId, AntaresApiVersion);

            if (!maybeFunctionApp.IsSuccessful)
            {
                return Tuple.Create<DiagnosticsResult, ArmResource<ArmFunctionApp>>(
                    HandleArmResponseError(armId, maybeFunctionApp.Error), null
                    );
            }
            else
            {
                return Tuple.Create(new DiagnosticsResult
                {
                    IsDiagnosingSuccessful = true,
                    SuccessResult = new DiagnoseSuccessResult
                    {
                        HealingActions = Enumerable.Empty<HealingAction>()
                    }
                }, maybeFunctionApp.Result);
            }
        }

        private DiagnosticsResult HandleArmResponseError(string armId, HttpResponseMessage response)
        {
            switch (response.StatusCode)
            {
                case HttpStatusCode.Forbidden:
                case HttpStatusCode.Unauthorized:
                    return new DiagnosticsResult
                    {
                        IsDiagnosingSuccessful = false,
                        ErrorResult = new DiagnoseErrorResult
                        {
                            ErrorMessage = Resources.backend_error_CannotAccessFunctionApp,
                            ErrorId = ErrorIds.CannotAccessFunctionAppArmResource,
                            UserActions = new[]
                            {
                                    Resources.backend_error_CannotAccessFunctionApp_action_1,
                                    string.Format(Resources.backend_error_CannotAccessFunctionApp_action_2, armId),
                                    string.Format(
                                        Resources.backend_error_CannotAccessFunctionApp_action_3,
                                        GetSupportErrorCode(armId, ErrorIds.CannotAccessFunctionAppArmResource, response)
                                        )
                                }
                        }
                    };
                case HttpStatusCode.InternalServerError:
                case HttpStatusCode.GatewayTimeout:
                case HttpStatusCode.ServiceUnavailable:
                    return new DiagnosticsResult
                    {
                        IsDiagnosingSuccessful = false,
                        ErrorResult = new DiagnoseErrorResult
                        {
                            ErrorMessage = Resources.backend_error_UnexpectedArmError,
                            ErrorId = ErrorIds.UnexpectedArmError,
                            UserActions = new[]
                            {
                                    string.Format(
                                        Resources.backend_error_UnexpectedArmError_action_1,
                                        GetSupportErrorCode(armId, ErrorIds.UnexpectedArmError, response)
                                        )
                                }
                        }
                    };
                default:
                    return new DiagnosticsResult
                    {
                        IsDiagnosingSuccessful = false,
                        ErrorResult = new DiagnoseErrorResult
                        {
                            ErrorMessage = Resources.backend_error_UnknownErrorWhileCallingArm,
                            ErrorId = ErrorIds.UnknownErrorCallingArm,
                            UserActions = new[]
                            {
                                    string.Format(
                                        Resources.backend_error_UnknownErrorWhileCallingArm_action_1,
                                        GetSupportErrorCode(armId, ErrorIds.UnexpectedArmError, response)
                                        )
                                }
                        }
                    };
            }
        }

        private string GetSupportErrorCode(params object[] items)
        {
            var obj = new JObject();
            for (var i = 0; i < items.Length; i++)
            {
                obj[$"item{i}"] = JToken.FromObject(items[0]);
            }
            obj["timestamp"] = DateTimeOffset.UtcNow;
            obj["portal_instance"] = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME");
            return JsonConvert.SerializeObject(obj);
        }
    }
}