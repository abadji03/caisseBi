import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-etudiant',
  standalone: true,
  imports: [
    //BrowserModule,
    CommonModule,
    FormsModule,
    
// TODO: `HttpClientModule` should not be imported into a component directly.
// Please refactor the code to add `provideHttpClient()` call to the provider list in the
// application bootstrap logic and remove the `HttpClientModule` import from this component.
HttpClientModule
  ],
  templateUrl: './etudiant.component.html',
  styleUrl: './etudiant.component.css'
})
export class EtudiantComponent {

  StudentArray : any[] = [];
  isResultLoaded = false;
  isUpdateFormActive = false;
  nom: string ="";
  cours: string ="";
  frais: string ="";
  currentStudentID = "";
  constructor(private http: HttpClient ) 
  {
    this.getAllStudent();
  }
  ngOnInit(): void {
  }
  getAllStudent()
  { 
    this.http.get("http://localhost:8080/api/etudiant")
    .subscribe((resultData: any)=>
    {
        this.isResultLoaded = true;
        console.log(resultData.data);
        this.StudentArray = resultData.data;
    });
  }
  
  register()
  {
   // this.isLogin = false; 
   // alert("hi");
    let bodyData = {
      "nom" : this.nom,
      "cours" : this.cours,
      "frais" : this.frais
    };
    this.http.post("http://localhost:8080/api/etudiant/add",bodyData).subscribe((resultData: any)=>
    {
        console.log(resultData);
        alert("Employee Registered Successfully")
        this.getAllStudent();
      //  this.name = '';
      //  this.address = '';
      //  this.mobile  = 0;
    });
  }
  setUpdate(data: any) 
  {
   this.nom = data.nom;
   this.cours = data.cours;
   this.frais = data.frais;
  
   this.currentStudentID = data.id;
 
  }
  UpdateRecords()
  {
    let bodyData = 
    {
      "nom" : this.nom,
      "cours" : this.cours,
      "frais" : this.frais
    };
    
    this.http.put("http://localhost:8080/api/etudiant/update"+ "/"+ this.currentStudentID,bodyData).subscribe((resultData: any)=>
    {
        console.log(resultData);
        alert("Student Registered Updateddd")
        this.getAllStudent();
      
    });
  }
 
  save()
  {
    if(this.currentStudentID == '')
    {
        this.register();
    }
      else
      {
       this.UpdateRecords();
      }       
  }
  setDelete(data: any)
  {
    this.http.delete("http://localhost:8080/api/etudiant/delete"+ "/"+ data.id).subscribe((resultData: any)=>
    {
        console.log(resultData);
        alert("Student Deletedddd")
        this.getAllStudent();
    });
  }
}
