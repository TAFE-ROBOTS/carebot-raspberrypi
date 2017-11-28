carebot - raspberry pi module
=============================

Responsibilities
----------------

- Regularly take a photo and process in the cloud for:
  1 - Items to comment on.
  2 - Faces (if a face then check if the face is recognised else introduce and register face).
  3 - Need to move to face the person (via the Arduino).

- Regularly listen for input, process and respond using cloud services.

- Choose which icon to show on the 16x16 LED display (via the Arduino).

- Control the expression of the eyes.

Setup
-----

Configure and set your AWS profile
```
export AWS_PROFILE=morsel.tech
```
