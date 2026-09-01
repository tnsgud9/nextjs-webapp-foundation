"use client"

import * as React from "react"
import { CircleCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

export function QuickSurvey() {
  const [submitted, setSubmitted] = React.useState(false)

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <CircleCheckIcon className="size-8 text-primary" />
          <div className="text-sm font-medium">Thanks for your feedback</div>
          <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
            Start over
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Questionnaire
          shortcuts="letters"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
          }}
        >
          <QuestionnaireProgress />
          <QuestionnaireItem name="role" required>
            <QuestionnaireTitle>What best describes your role?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="design">
                Design
                <QuestionnaireChoiceDescription>
                  Interfaces, research, and prototypes
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="engineering">
                Engineering
                <QuestionnaireChoiceDescription>
                  Building and running the product
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="other">Something else</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="features" multiple>
            <QuestionnaireTitle>Which features do you use?</QuestionnaireTitle>
            <QuestionnaireDescription>Pick all that apply.</QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="reports">Reports</QuestionnaireChoice>
              <QuestionnaireChoice value="alerts">Alerts</QuestionnaireChoice>
              <QuestionnaireChoice value="exports">Exports</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="comment">
            <QuestionnaireTitle>Anything else we should know?</QuestionnaireTitle>
            <QuestionnaireInput placeholder="Your answer" />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
      </CardContent>
    </Card>
  )
}
