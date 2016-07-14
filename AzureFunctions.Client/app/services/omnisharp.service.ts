import {Injectable}     from '@angular/core';
import {Http, Response} from '@angular/http';
import {Observable}     from 'rxjs/Observable';
import {Headers} from '@angular/http';
import {Models, Stdio} from './../models/omnisharp-server';

@Injectable()
export class OmniService {
    private url: string = "https://localhost:44328/api/omnisharp";

    constructor(public http: Http) {
    }

    getOmniSharp(request: Stdio.Protocol.RequestPacket): any {

        return this.http.post(this.url, JSON.stringify(
            {
                Content: JSON.stringify(request)
            }),
            {
                headers: this.addJsonHeader()
            }).toPromise();
    }

    addJsonHeader(headers?: Headers): Headers {
        if (!headers) {
            headers = new Headers();
        }
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");
        return headers;
    }
}