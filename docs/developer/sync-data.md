# Syncing Data to Coach Watts

This guide explains how to sync third-party data—including activities, wellness metrics, and nutrition logs—to Coach Watts via our OAuth 2.0 API.

## Core Scopes

To write data, your application must request the following scopes during the authorization flow:

| Scope             | Resource       | Access Provided                                  |
| :---------------- | :------------- | :----------------------------------------------- |
| `workout:write`   | **Activities** | Upload .FIT files and manage workouts.           |
| `health:write`    | **Wellness**   | Log daily metrics like HRV, Sleep, and Weight.   |
| `nutrition:write` | **Nutrition**  | Log calories, macros, and individual meal items. |
| `profile:write`   | **Profile**    | Update core athlete metrics (Weight, FTP).       |

---

## 1. Activities (FIT Files)

Coach Watts is built to process high-resolution training data. We recommend uploading original `.fit` files whenever possible.

- **Endpoint:** `POST /api/workouts/upload-fit`
- **Content-Type:** `multipart/form-data`

### Request Fields

| Field      | Type       | Description                                                                                    |
| :--------- | :--------- | :--------------------------------------------------------------------------------------------- |
| `file`     | **Binary** | The `.fit` file to process.                                                                    |
| `metadata` | **String** | (Optional) A JSON string containing any raw data you wish to preserve in our `rawJson` column. |

### Example (cURL)

```bash
curl -X POST https://app.coachwatts.com/api/workouts/upload-fit
  -H "Authorization: Bearer YOUR_TOKEN"
  -F "file=@workout.fit"
  -F "metadata={"app_version": "1.2.0", "device_id": "XYZ-99"}"
```

---

## 2. Wellness Metrics

Use this endpoint to sync daily health indicators. Coach Watts uses these to adjust the athlete's recovery capacity scores.

- **Endpoint:** `POST /api/wellness`
- **Content-Type:** `application/json`

### Payload Schema

| Field        | Type        | Description                                           |
| :----------- | :---------- | :---------------------------------------------------- |
| `date`       | **String**  | **Required.** YYYY-MM-DD or ISO 8601.                 |
| `hrv`        | **Number**  | Heart Rate Variability (ms).                          |
| `restingHr`  | **Integer** | Resting Heart Rate (bpm).                             |
| `sleepHours` | **Number**  | Total sleep duration in hours.                        |
| `weight`     | **Number**  | Body weight in kilograms (kg).                        |
| `rawJson`    | **Object**  | (Optional) Your raw payload for historical reference. |

### Example

```json
{
  "date": "2026-02-15",
  "hrv": 72,
  "restingHr": 48,
  "sleepHours": 8.2,
  "weight": 74.5,
  "rawJson": { "original_source": "Oura" }
}
```

---

## 3. Nutrition & Fueling

Nutrition sync is critical for our **Metabolic Wave** engine. We use exact timestamps to calculate glycogen availability for future workouts.

- **Endpoint:** `POST /api/nutrition`
- **Content-Type:** `application/json`

### Flat Timeline Sync

Instead of categorizing items into "Breakfast" or "Dinner," send a flat list of items with their exact consumption time. Coach Watts will automatically bucket them based on the user's custom meal windows.

### Payload Schema

| Field     | Type        | Description                                    |
| :-------- | :---------- | :--------------------------------------------- |
| `date`    | **String**  | **Required.** YYYY-MM-DD or ISO 8601.          |
| `items`   | **Array**   | List of food items (see below).                |
| `waterMl` | **Integer** | Total fluid intake for the day in milliliters. |
| `rawJson` | **Object**  | (Optional) Your raw payload for reference.     |

#### Food Item Object

| Field            | Type       | Description                                                     |
| :--------------- | :--------- | :-------------------------------------------------------------- |
| `name`           | **String** | **Required.** Name of the food/meal.                            |
| `logged_at`      | **String** | **Required.** ISO 8601 timestamp of consumption.                |
| `carbs`          | **Number** | Carbohydrates in grams.                                         |
| `protein`        | **Number** | Protein in grams.                                               |
| `fat`            | **Number** | Fat in grams.                                                   |
| `absorptionType` | **Enum**   | `RAPID`, `FAST`, `BALANCED`, `DENSE`. (Defaults to `BALANCED`). |

### Example

```json
{
  "date": "2026-02-15",
  "items": [
    {
      "name": "Pre-Ride Gel",
      "carbs": 25,
      "logged_at": "2026-02-15T06:00:00Z",
      "absorptionType": "RAPID"
    }
  ],
  "rawJson": { "original_app": "MyFitnessPal" }
}
```

_Note: If you provide `items`, Coach Watts will automatically calculate daily macro totals for the athlete._

---

## General Principles

### **1. Raw Data Preservation (`rawJson`)**

We encourage developers to send their data exactly as it appears in their own system via the `rawJson` field (or `metadata` for files). We store this data alongside the processed records so we can re-parse or enhance the integration as our metabolic engine evolves.

### **2. Idempotency**

All sync endpoints use an **upsert** logic based on the `date` (for wellness/nutrition) or `hash` (for files). Sending the same data multiple times will update the existing record rather than creating duplicates.

### **3. Timezones**

Always send timestamps in **ISO 8601 with timezone offsets** (e.g., `2026-02-15T08:00:00+01:00`). For daily aggregates (the `date` field), use the user's local calendar date.
