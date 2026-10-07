ok everything goes well i have following issues
to fix

# About the linked sheet
live version connected sheet is not specific to the upc folder linka  same common issue as i have mentioned below

and one more important issue is that i have the title , upc , qty , and other columns user have created as empty values are not being gog there see the issue and fix this

# About Exported Csv
in exported version

i dont have all the entries as we see in the linked sheet 
# Common issue 
when i open the picture drive folder it opens the 2026 folder directly not the { specific to the upc folder }

and i want the folder named as the { upc } in case we have entry of same upc it would be lke {upc(1) and as we handle the same name and i want all images in that folder and of course the upc folder would be in the year --> month ---> date folder but the link we would have in csv should be like { year / month / date / upc / }}

and i dont want the all 5 images link column in the connected sheet got it remove all
image 1 image 2 image 3 image 4 image 5 unnecessary columns as user can directy open folder of that entry

so do the implementations



# new

Empty values not going to sheet: Custom fields with empty values aren't being written to the sheet (the appendProductRowToSheet uses the field name as key but the record stores by id).

is not empty i was writting the value in form but not bing stored i sheet