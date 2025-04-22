import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { createApi } from 'unsplash-js';
import { environment } from '../../environments/environment'; // Assuming you have environment files set up

@Injectable({
    providedIn: 'root', // Provide the service at the root level
})
export class UnsplashService {
    private unsplash = createApi({
        accessKey: environment.unsplashAccessKey, // Store your key in environment files
    });

    getRandomPhotoUrl(query: string = 'gym,exercise'): Observable<string | undefined> {
        return from(
            this.unsplash.photos.getRandom({
                query: query,
                orientation: 'landscape',
            })
        ).pipe(
            map((response) => {
                if (response.type === 'success') {
                    const photo = Array.isArray(response.response) ? response.response[0] : response.response;
                    // Prefer regular size URL, fallback to small
                    return photo?.urls.regular || photo?.urls.small;
                } else {
                    console.error('Error fetching image from Unsplash:', response.errors);
                    return undefined; // Or a default fallback image URL
                }
            })
        );
    }
}
