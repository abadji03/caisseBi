import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../modeles/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiURL = "http://localhost:8080";
  private prefixe = "/api/users";
  private users: User[] = [];



  /*------------------------------------------

  --------------------------------------------

  Http Header Options

  --------------------------------------------

  --------------------------------------------*/

  httpOptions = {

    headers: new HttpHeaders({

      'Content-Type': 'application/json'

    })

  }



  /*------------------------------------------

  --------------------------------------------

  Created constructor

  --------------------------------------------

  --------------------------------------------*/

  constructor(private httpClient: HttpClient) { }



  /**

   * Write code on Method

   *

   * @return response()

   */

  getAll(): Observable<any> {



    return this.httpClient.get(this.apiURL +this.prefixe+ '/findAll')

    .pipe(

      catchError(this.errorHandler)

    )

  }



  /**

   * Write code on Method

   *

   * @return response()

   */

  create(user:User): Observable<any> {



    return this.httpClient.post(this.apiURL +this.prefixe+'/add/'+ user.email, JSON.stringify(user), this.httpOptions)

    .pipe(

      catchError(this.errorHandler)

    )

  }



  /**

   * Write code on Method

   *

   * @return response()

   */

  find(id:number): Observable<any> {



    return this.httpClient.get(this.apiURL +this.prefixe+ '/find/' + id)

    .pipe(

      catchError(this.errorHandler)

    )

  }



  /**

   * Write code on Method

   *

   * @return response()

   */

  update(id:number, user:User): Observable<any> {



    return this.httpClient.put(this.apiURL+this.prefixe+ '/update/' + id, JSON.stringify(user), this.httpOptions)

    .pipe(

      catchError(this.errorHandler)

    )

  }

  findUserWithEmail(email:string): Observable<any> {



    return this.httpClient.get(this.apiURL +this.prefixe+ '/findEmail/' + email)

    .pipe(

      catchError(this.errorHandler)

    )

  }


  /**

   * Write code on Method

   *

   * @return response()

   */

  delete(id:number){

    return this.httpClient.delete(this.apiURL+this.prefixe+ '/delete/' + id, this.httpOptions)

    .pipe(

      catchError(this.errorHandler)

    )

  }



  /**

   * Write code on Method

   *

   * @return response()

   */

  errorHandler(error:any) {

    let errorMessage = '';

    if(error.error instanceof ErrorEvent) {

      errorMessage = error.error.message;

    } else {

      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

    }

    return throwError(errorMessage);

 }

 getUsers(): User[] {
  return this.users;
}

addUser(user: User) {
  user.id = this.users.length + 1;
  this.users.push(user);
}

updateUser(id: number, updatedUser: User) {
  const index = this.users.findIndex(user => user.id === id);
  if (index !== -1) {
    this.users[index] = { ...updatedUser, id };
  }
}

deleteUser(id: number) {
  this.users = this.users.filter(user => user.id !== id);
}
}
