import { useAuth, useUser } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

const Profile = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const handleSignOut = () => {
    Alert.alert("Singout", "confirm to sign out", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/SignUp");
        },
      },
    ]);
  };
  return (
    <View>
      <Text>Profile</Text>
      <TouchableOpacity
        onPress={handleSignOut}
        className="bg-red-400 border w-20 m-4"
      >
        <Text>Singout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile;
