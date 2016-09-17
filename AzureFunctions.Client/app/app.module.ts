/// <reference path="..\typings\browser.d.ts" />

import {NgModule}      from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {HttpModule} from '@angular/http';

import {AppComponent} from './components/app.component';
import {AggregateBlock} from './components/aggregate-block.component';
import {AppMonitoringComponent} from './components/app-monitoring.component';
import {AppSettingsComponent} from './components/app-settings.component';
import {BindingDesignerComponent} from './components/binding-designer.component';
import {BindingInputComponent} from './components/binding-input.component';
import {BindingComponent} from './components/binding.component';
import {BusyStateComponent} from './components/busy-state.component';
import {CopyPreComponent} from './components/copy-pre.component';
import {DashboardComponent} from './components/dashboard.component';
import {DropDownComponent} from './components/drop-down.component';
import {ErrorListComponent} from './components/error-list.component';
import {FileExplorerComponent} from './components/file-explorer.component';
import {FunctionDesignerComponent} from './components/function-designer.component';


import {} from './components/function-dev.component';
import {} from './components/function-edit.component';
import {} from './components/function-integrate-v2.component';
import {} from './components/function-integrate.component';
import {} from './components/function-manage.component';
import {} from './components/function-monitor.component';
import {} from './components/function-new.component';
import {} from './components/getting-started.component';
import {} from './components/intro.component';
import {} from './components/log-streaming.component';
import {} from './components/pop-over.component';
import {} from './components/radio-selector.component';
import {} from './components/sidebar.component';
import {} from './components/source-control.component';
import {} from './components/table-function-monitor.component';
import {} from './components/template-picker.component';
import {} from './components/tooltip.component';
import {} from './components/tooltip-content.component';
import {} from './components/top-bar.component';
import {} from './components/trial-expired.component';
import {} from './components/try-landing.component';
import {} from './components/try-now-busy-state.component';
import {} from './components/try-now.component';
import {} from './components/.component';
import {} from './components/.component';
import {} from './components/.component';
import {} from './components/.component';
import {} from './components/.component';
import {} from './components/.component';
import {} from './components/.component';
import {} from './components/.component';





import {provide, ExceptionHandler, enableProdMode, Injector} from '@angular/core';
import {FunctionsService} from './services/functions.service';
import {UserService} from './services/user.service';
import {PortalService} from './services/portal.service';
import {BroadcastService} from './services/broadcast.service';
import {FunctionsExceptionHandler} from './handlers/functions.exception-handler';
import {FunctionMonitorService} from './services/function-monitor.service'
import {ArmService} from './services/arm.service';
import {MonitoringService} from './services/app-monitoring.service';
import {TelemetryService} from './services/telemetry.service';
import {UtilitiesService} from './services/utilities.service';
import {BackgroundTasksService} from './services/background-tasks.service';
import {GlobalStateService} from './services/global-state.service';
import {TRANSLATE_PROVIDERS} from 'ng2-translate/ng2-translate';
import {AiService} from './services/ai.service';
import 'rxjs/Rx';
import {aggregateBlockPipe} from './pipes/aggregate-block.pipe';
import {TranslatePipe} from 'ng2-translate/ng2-translate';



declare var mixpanel: any;


@NgModule({
    imports: [
        BrowserModule,
        HttpModule
    ],
    declarations: [
        AppComponent,
        aggregateBlockPipe,
        TranslatePipe
    ],
    providers: [
        TRANSLATE_PROVIDERS,
        BroadcastService,
        FunctionsService,
        FunctionMonitorService,
        UserService,
        PortalService,
        provide(ExceptionHandler, {useClass: FunctionsExceptionHandler}),
        ArmService,
        MonitoringService,
        TelemetryService,
        UtilitiesService,
        BackgroundTasksService,
        GlobalStateService,
        AiService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
    constructor() {
        if (window.location.hostname.indexOf('localhost') === -1) {
            enableProdMode();
        }

        if (typeof mixpanel !== 'undefined') {
            var correlationId = this.getParameterByName("correlationId");
            if (correlationId) {
                mixpanel.identify(correlationId);
            }
        }
    }


    // http://stackoverflow.com/a/901144
    getParameterByName(name: string): string {
        var url = window.location.href;
        url = url.toLowerCase(); // This is just to avoid case sensitiveness
        name = name.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter name
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

}

