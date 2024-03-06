'use server'

import { redirect } from 'next/navigation';
import React from 'react';

export async function CheckPage() {
    React.useEffect(() => {
        fetch('/api/users', {
            method: 'POST'
        })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            redirect('/check'); // Correctly placed inside a callback
        });
    }, []); // Added an empty dependency array

    return (
        <>{redirect('/')}</>
    );
}

  
  
  
  
  
  
  
  