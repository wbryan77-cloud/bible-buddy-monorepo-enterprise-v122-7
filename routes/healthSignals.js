const express = require('express');

const router = express.Router();

function classifyBloodPressure({ systolic, diastolic, symptoms = [] }) {
  const symptomList = Array.isArray(symptoms)
    ? symptoms.map((s) => String(s).toLowerCase())
    : [];

  const hasEmergencySymptoms = symptomList.some((s) =>
    ['chest pain', 'shortness of breath', 'vision change', 'weakness', 'difficulty speaking', 'numbness'].includes(s)
  );

  if (systolic >= 180 || diastolic >= 120) {
    if (hasEmergencySymptoms) {
      return {
        level: 'emergency',
        message:
          'Your blood pressure reading is critically high and symptoms were reported. Please seek emergency medical care immediately or call emergency services.',
        actions: [
          'Sit calmly and recheck after one minute if safe to do so.',
          'Call emergency services immediately if symptoms continue.',
        ],
      };
    }

    return {
      level: 'urgent',
      message:
        'Your blood pressure reading is extremely high. Please sit quietly, recheck after one minute, and contact a healthcare professional promptly if it remains elevated.',
      actions: [
        'Recheck after one minute.',
        'Contact a healthcare professional promptly.',
      ],
    };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return {
      level: 'elevated',
      message:
        'Your blood pressure reading appears elevated/high. Consider checking it again and discussing it with a healthcare professional.',
      actions: ['Recheck later today.', 'Track patterns over time.', 'Consider professional medical advice.'],
    };
  }

  if (systolic >= 120 || diastolic >= 80) {
    return {
      level: 'notice',
      message:
        'Your reading is slightly elevated. Continue healthy routines and monitor trends over time.',
      actions: ['Stay hydrated.', 'Rest and monitor trends.'],
    };
  }

  return {
    level: 'normal',
    message: 'Your reading is currently within a typical range.',
    actions: ['Continue healthy stewardship habits.'],
  };
}

router.post('/interpret', async (req, res) => {
  try {
    const body = req.body || {};
    const bloodPressure = body.bloodPressure || {};
    const heartRate = body.heartRate || null;
    const symptoms = body.symptoms || [];

    let interpretation = {
      level: 'notice',
      message: 'No supported signals were supplied.',
      actions: [],
    };

    if (
      typeof bloodPressure.systolic === 'number' &&
      typeof bloodPressure.diastolic === 'number'
    ) {
      interpretation = classifyBloodPressure({
        systolic: bloodPressure.systolic,
        diastolic: bloodPressure.diastolic,
        symptoms,
      });
    }

    res.json({
      ok: true,
      interpretation: {
        ...interpretation,
        heartRate,
        notMedicalDiagnosis: true,
        generatedAt: new Date().toISOString(),
      },
      guidance: {
        scriptureFriendly: true,
        truthWithoutDiagnosis: true,
        emergencyEscalationEnabled: true,
      },
    });
  } catch (error) {
    console.error('Health signal interpretation error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
